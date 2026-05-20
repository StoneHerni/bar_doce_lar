'use client';

import { useState } from 'react';
import {
  Banknote,
  ArrowUpRight,
  ArrowDownRight,
  PlusCircle,
  FileText,
  Calendar,
  AlertCircle,
  Download
} from 'lucide-react';
import styles from './Reports.module.css';
import { registerMovement } from './actions';
import { useRouter } from 'next/navigation';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const fmt = (n: number) => Math.round(n).toLocaleString('pt-AO');

export default function ReportsClient({ initialData, userRole, userName }: { initialData: any, userRole: 'admin' | 'funcionario', userName: string }) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [movement, setMovement] = useState({ tipo: 'despesa', descricao: '', valor: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const isAdmin = userRole === 'admin';

  const handleRegisterMovement = async () => {
    if (!movement.descricao || movement.valor <= 0) return;

    setIsProcessing(true);
    const result = await registerMovement(movement.tipo, movement.descricao, movement.valor);

    if (result.success) {
      alert('Registrado com sucesso!');
      setIsModalOpen(false);
      setMovement({ tipo: 'despesa', descricao: '', valor: 0 });
      router.refresh();
    } else {
      alert(`Erro: ${result.error}`);
    }
    setIsProcessing(false);
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const today = new Date().toLocaleDateString('pt-AO');
    const now = new Date().toLocaleString('pt-AO');

    doc.setFontSize(20);
    doc.setTextColor(233, 69, 96);
    doc.text('BAR DOCE LAR', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text('Relatório de Vendas', 105, 28, { align: 'center' });
    doc.text(`Data: ${today}`, 105, 35, { align: 'center' });
    doc.text(`Gerado por: ${userName}`, 105, 42, { align: 'center' });
    doc.text(`Horário: ${now}`, 105, 49, { align: 'center' });

    const totalVendas = initialData.salesByType.reduce((acc: number, s: any) => acc + s.total_vendido, 0);
    const totalRecebido = initialData.salesByType.reduce((acc: number, s: any) => acc + s.total_pago, 0);
    const totalFiado = totalVendas - totalRecebido;

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Total de Vendas: ${fmt(totalVendas)} Kz`, 20, 60);
    doc.text(`Total Recebido: ${fmt(totalRecebido)} Kz`, 20, 68);
    doc.text(`Total Fiado: ${fmt(totalFiado)} Kz`, 20, 76);
    doc.text(`Total em Caixa: ${fmt(initialData.summary.totalCash)} Kz`, 20, 84);

    autoTable(doc, {
      startY: 92,
        head: [['Método', 'Total Vendido', 'Total Recebido', 'Pendente']],
        body: initialData.salesByType.map((sale: any) => [
          sale.tipo_pagamento,
          `${fmt(sale.total_vendido)} Kz`,
          `${fmt(sale.total_pago)} Kz`,
          `${fmt(sale.total_vendido - sale.total_pago)} Kz`
        ]),
        styles: { fontSize: 10 },
        headStyles: { fillColor: [233, 69, 96] },
        alternateRowStyles: { fillColor: [245, 245, 245] }
      });

      autoTable(doc, {
        startY: (doc as any).lastAutoTable?.finalY + 10 || 120,
        head: [['Produto', 'Estoque', 'Preço', 'Perdas']],
        body: initialData.productExtract.map((prod: any) => [
          prod.nome,
          `${prod.stock} un`,
          `${fmt(prod.preco)} Kz`,
          `${prod.perdas_hoje} un`
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [233, 69, 96] },
        alternateRowStyles: { fillColor: [245, 245, 245] }
      });

      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text('Gerado automaticamente pelo sistema Bar Doce Lar', 105, 285, { align: 'center' });

      doc.save(`relatorio-vendas-${today.replace(/\//g, '-')}.pdf`);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1>{isAdmin ? 'Fechamento de Caixa' : 'Vendas do Dia'}</h1>
          <p>Relatório diário e controle financeiro.</p>
        </div>
        <div className={styles.headerActions}>
          <button className="btn-secondary" onClick={generatePDF}>
            <Download size={20} /> Exportar PDF
          </button>
          {isAdmin && (
            <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
              <PlusCircle size={20} /> Registrar
            </button>
          )}
        </div>
      </header>

      <div className={styles.topGrid}>
        <div className={`glass-card ${styles.mainMetric}`}>
          <div className={styles.metricLabel}>
             <Banknote size={24} />
             <span>Total em Caixa (Dinheiro)</span>
          </div>
          <h2>{initialData.summary.totalCash.toLocaleString('pt-AO') + ' Kz'}</h2>
          <div className={styles.metricSub}>
            <span className={styles.entry}><ArrowUpRight size={14} /> +{initialData.summary.extraEntries.toLocaleString('pt-AO') + ' Kz'} extras</span>
            <span className={styles.expense}><ArrowDownRight size={14} /> -{initialData.summary.expenses.toLocaleString('pt-AO') + ' Kz'} despesas</span>
          </div>
        </div>

        <div className={styles.secondaryGrid}>
          <div className="glass-card">
            <span className={styles.cardLabel}>Vendas Hoje</span>
            <h3>{initialData.salesByType.reduce((acc: number, s: any) => acc + s.total_vendido, 0).toLocaleString('pt-AO') + ' Kz'}</h3>
          </div>
          <div className="glass-card">
            <span className={styles.cardLabel}>Perdas Hoje</span>
            <h3 className={initialData.summary.losses > 0 ? styles.hasLoss : ''}>{initialData.summary.losses} unidades</h3>
          </div>
        </div>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <FileText size={20} />
          <h2>Vendas por Tipo de Pagamento</h2>
        </div>
        <div className="glass-card">
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Método</th>
                <th>Total Vendido</th>
                <th>Total Recebido</th>
                <th>Pendente (Fiado)</th>
              </tr>
            </thead>
            <tbody>
              {initialData.salesByType.map((sale: any) => (
                <tr key={sale.tipo_pagamento}>
                  <td style={{ textTransform: 'capitalize' }}>{sale.tipo_pagamento}</td>
                  <td>{sale.total_vendido.toLocaleString('pt-AO') + ' Kz'}</td>
                  <td>{sale.total_pago.toLocaleString('pt-AO') + ' Kz'}</td>
                  <td className={sale.total_vendido - sale.total_pago > 0 ? styles.hasDebt : ''}>
                    {(sale.total_vendido - sale.total_pago).toLocaleString('pt-AO') + ' Kz'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <AlertCircle size={20} />
          <h2>Extrato de Produtos</h2>
        </div>
        <div className="glass-card">
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Produto</th>
                <th>Estoque Atual</th>
                <th>Preço Unitário</th>
                <th>Perdas (Hoje)</th>
              </tr>
            </thead>
            <tbody>
              {initialData.productExtract.map((prod: any) => (
                <tr key={prod.nome}>
                  <td>{prod.nome}</td>
                  <td>{prod.stock} un</td>
                  <td>{prod.preco.toLocaleString('pt-AO') + ' Kz'}</td>
                  <td className={prod.perdas_hoje > 0 ? styles.hasLoss : ''}>{prod.perdas_hoje} un</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={`glass-card ${styles.modal}`}>
            <h2>Nova Movimentação</h2>
            
            <div className={styles.typeSelector}>
              <button 
                className={`${styles.typeBtn} ${movement.tipo === 'despesa' ? styles.typeExpense : ''}`}
                onClick={() => setMovement({...movement, tipo: 'despesa'})}
              >
                Despesa
              </button>
              <button 
                className={`${styles.typeBtn} ${movement.tipo === 'entrada' ? styles.typeEntry : ''}`}
                onClick={() => setMovement({...movement, tipo: 'entrada'})}
              >
                Entrada Extra
              </button>
            </div>

            <div className={styles.formGroup}>
              <label>Descrição</label>
              <input 
                type="text" 
                placeholder="Ex: Pagamento de energia, Compra de gelo..."
                value={movement.descricao}
                onChange={(e) => setMovement({...movement, descricao: e.target.value})}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Valor (Kz)</label>
              <input 
                type="number" 
                value={movement.valor}
                onChange={(e) => setMovement({...movement, valor: Number(e.target.value)})}
              />
            </div>

            <div className={styles.modalActions}>
              <button className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleRegisterMovement} disabled={isProcessing}>
                {isProcessing ? 'Registrando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
