'use client';

import { useState } from 'react';
import { Trash2, Search, Eye, X, FileDown, Printer, Calendar, FileSpreadsheet } from 'lucide-react';
import { deleteSale } from '../pos/actions';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getDailyReportData } from './actions';

interface Sale {
  id: number;
  data: string;
  tipo_pagamento: string;
  total: number;
  pago: number;
  divida: number;
  cliente_nome: string | null;
  funcionario_nome?: string | null;
}

interface SaleItem {
  id: number;
  produto_nome: string;
  quantidade: number;
  preco_unitario: number;
}

const styles = {
  searchBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    background: 'var(--bg-secondary)',
    borderRadius: '12px',
    border: '1px solid var(--glass-border)',
    marginBottom: '1.5rem'
  }
};

export default function SalesHistory({ sales, isAdmin }: { sales: Sale[], isAdmin: boolean }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [isExporting, setIsExporting] = useState(false);
  const [isPrintingBlank, setIsPrintingBlank] = useState(false);

  const formatPrice = (name: string, price: number) => {
    const normalized = name.toLowerCase();
    if (['doppel', 'cuca', 'eka', 'nocal', 'booster'].includes(normalized)) {
      return '3/1000';
    }
    return `${Math.round(price)}`;
  };

  const exportOfficialPDF = async (blank: boolean = false) => {
    if (blank) {
      setIsPrintingBlank(true);
    } else {
      setIsExporting(true);
    }

    const result = await getDailyReportData(reportDate);
    if (!result.success || !result.data) {
      showToast(result.error || 'Erro ao carregar dados do relatório', 'error');
      setIsExporting(false);
      setIsPrintingBlank(false);
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape' });
    const formattedDate = reportDate.split('-').reverse().join(' / ');

    // Title
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('BAR DOCE LAR DO B J', 148, 20, { align: 'center' });

    // Lines for Nome and Data
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Nome: __________________________________________________', 20, 32);
    doc.text(`Data:  ${formattedDate}`, 220, 32);

    // Columns
    const headers = [
      'produto',
      'Stock',
      'RESTOU',
      'prateleira',
      'Restou',
      'Arca',
      'Restou',
      'Preço',
      'Venda pronto',
      'Venda prazo',
      'Perda',
      'Total'
    ];

    const rows = result.data.map((item: any) => {
      return [
        item.produto,
        blank ? '' : (item.stock > 0 ? `${item.stock}` : ''),
        blank ? '' : (item.restouPrateleira !== null && item.restouPrateleira !== undefined ? `${item.restouPrateleira}` : ''), // RESTOU (Shelf Leftover)
        '', // prateleira (Refill)
        blank ? '' : (item.restouArca !== null && item.restouArca !== undefined ? `${item.restouArca}` : ''), // Restou (Freezer Leftover)
        '', // Arca (Refill)
        blank ? '' : (item.restouTotal !== null && item.restouTotal !== undefined ? `${item.restouTotal}` : ''), // Restou (Total Leftover)
        formatPrice(item.produto, item.preco),
        blank ? '' : (item.vendaPronto > 0 ? `${item.vendaPronto}` : ''),
        blank ? '' : (item.vendaPrazo > 0 ? `${item.vendaPrazo}` : ''),
        blank ? '' : (item.perda > 0 ? `${item.perda}` : ''),
        blank ? '' : (item.total > 0 ? `${Math.round(item.total)}` : '')
      ];
    });

    if (!blank) {
      const totalVendaPronto = result.data.reduce((acc: number, item: any) => acc + item.vendaPronto, 0);
      const totalVendaPrazo = result.data.reduce((acc: number, item: any) => acc + item.vendaPrazo, 0);
      const totalPerda = result.data.reduce((acc: number, item: any) => acc + item.perda, 0);
      const grandTotal = result.data.reduce((acc: number, item: any) => acc + item.total, 0);

      const totalRestouPrateleira = result.data.reduce((acc: number, item: any) => acc + (item.restouPrateleira || 0), 0);
      const totalRestouArca = result.data.reduce((acc: number, item: any) => acc + (item.restouArca || 0), 0);
      const totalRestouTotal = result.data.reduce((acc: number, item: any) => acc + (item.restouTotal || 0), 0);

      rows.push([
        'TOTAL',
        '', // Stock
        totalRestouPrateleira > 0 ? `${totalRestouPrateleira}` : '', // RESTOU
        '', // prateleira
        totalRestouArca > 0 ? `${totalRestouArca}` : '', // Restou
        '', // Arca
        totalRestouTotal > 0 ? `${totalRestouTotal}` : '', // Restou
        '', // Preço
        totalVendaPronto > 0 ? `${totalVendaPronto}` : '',
        totalVendaPrazo > 0 ? `${totalVendaPrazo}` : '',
        totalPerda > 0 ? `${totalPerda}` : '',
        grandTotal > 0 ? `${Math.round(grandTotal)}` : ''
      ]);
    } else {
      rows.push([
        'TOTAL',
        '', '', '', '', '', '', '', '', '', '', ''
      ]);
    }

    autoTable(doc, {
      startY: 40,
      head: [headers],
      body: rows,
      styles: {
        fontSize: 10,
        cellPadding: 3.5,
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
        textColor: [0, 0, 0],
        halign: 'center'
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        lineColor: [0, 0, 0],
        lineWidth: 0.1
      },
      columnStyles: {
        0: { halign: 'left', fontStyle: 'bold', cellWidth: 50 },
        1: { cellWidth: 16 },
        2: { cellWidth: 16 },
        3: { cellWidth: 16 },
        4: { cellWidth: 16 },
        5: { cellWidth: 16 },
        6: { cellWidth: 16 },
        7: { cellWidth: 20 },
        8: { cellWidth: 24 },
        9: { cellWidth: 24 },
        10: { cellWidth: 16 },
        11: { cellWidth: 24 }
      },
      alternateRowStyles: {
        fillColor: [255, 255, 255]
      },
      didParseCell: (data) => {
        if (data.row.index === rows.length - 1) {
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });

    const filename = blank ? `folha_controlo_em_branco_${reportDate}.pdf` : `relatorio_venda_oficial_${reportDate}.pdf`;
    doc.save(filename);
    showToast(blank ? 'Folha de controlo exportada!' : 'Relatório oficial exportado!', 'success');
    setIsExporting(false);
    setIsPrintingBlank(false);
  };

  const filteredSales = sales.filter(s => 
    s.id.toString().includes(search) || 
    (s.cliente_nome && s.cliente_nome.toLowerCase().includes(search.toLowerCase())) ||
    (s.funcionario_nome && s.funcionario_nome.toLowerCase().includes(search.toLowerCase()))
  );

  const viewSale = async (sale: Sale) => {
    setSelectedSale(sale);
    setLoadingItems(true);
    setShowModal(true);
    try {
      const res = await fetch(`/api/vendas/${sale.id}`);
      const items = await res.json();
      setSaleItems(items);
    } catch {
      setSaleItems([]);
    }
    setLoadingItems(false);
  };

  const handleDelete = async (saleId: number) => {
    if (!confirm('Eliminar esta venda? O stock será restaurado.')) return;
    
    const result = await deleteSale(saleId);
    if (result.success) {
      showToast('Venda eliminada!', 'success');
      setShowModal(false);
      setSelectedSale(null);
      router.refresh();
    } else {
      showToast(result.error || 'Erro', 'error');
    }
  };

  const fmt = (n: number) => n.toLocaleString('pt-AO');

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Histórico de Vendas</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          {isAdmin ? 'Visualize e elimine vendas' : 'Visualize vendas'}
        </p>
      </header>

      {isAdmin && (
        <div className="glass-card" style={{
          padding: '1.5rem',
          marginBottom: '2rem',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '16px'
        }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileSpreadsheet size={20} /> Relatório de Vendas (Modelo Oficial)
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
            Selecione a data para gerar o relatório no formato oficial de 12 colunas do Bar Doce Lar.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-secondary)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <Calendar size={18} color="var(--text-secondary)" />
              <input 
                type="date" 
                value={reportDate} 
                onChange={(e) => setReportDate(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '0.95rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button 
                className="btn-secondary" 
                onClick={() => exportOfficialPDF(true)} 
                disabled={isPrintingBlank || isExporting}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Printer size={18} /> {isPrintingBlank ? 'A gerar...' : 'Folha em Branco'}
              </button>
              <button 
                className="btn-primary" 
                onClick={() => exportOfficialPDF(false)} 
                disabled={isExporting || isPrintingBlank}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <FileDown size={18} /> {isExporting ? 'A exportar...' : 'Relatório Preenchido'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={styles.searchBar}>
        <Search size={20} color="var(--text-secondary)" />
        <input 
          type="text" 
          placeholder="Pesquisar por ID ou cliente..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            color: 'var(--text-primary)',
            fontSize: '1rem',
            outline: 'none'
          }}
        />
      </div>

      <div className="glass-card">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
              <th style={{ textAlign: 'left', padding: '1rem' }}>ID</th>
              <th style={{ textAlign: 'left', padding: '1rem' }}>Data</th>
              <th style={{ textAlign: 'left', padding: '1rem' }}>Cliente</th>
              <th style={{ textAlign: 'left', padding: '1rem' }}>Funcionário</th>
              <th style={{ textAlign: 'center', padding: '1rem' }}>Pagamento</th>
              <th style={{ textAlign: 'right', padding: '1rem' }}>Total</th>
              {isAdmin && <th style={{ textAlign: 'right', padding: '1rem' }}>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {filteredSales.map(sale => (
              <tr key={sale.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <td style={{ padding: '1rem', fontWeight: 600 }}>#{sale.id}</td>
                <td style={{ padding: '1rem' }}>{sale.data}</td>
                <td style={{ padding: '1rem' }}>{sale.cliente_nome || '-'}</td>
                <td style={{ padding: '1rem', color: 'var(--primary)', fontWeight: 500 }}>{sale.funcionario_nome || 'Admin/Sistema'}</td>
                <td style={{ padding: '1rem', textAlign: 'center' }}>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    background: sale.tipo_pagamento === 'fiado' ? 'rgba(239, 68, 68, 0.1)' : 
                                 sale.tipo_pagamento === 'dinheiro' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                    color: sale.tipo_pagamento === 'fiado' ? 'var(--danger)' : 
                           sale.tipo_pagamento === 'dinheiro' ? 'var(--success)' : 'var(--primary)'
                  }}>
                    {sale.tipo_pagamento}
                  </span>
                </td>
                <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>{fmt(sale.total)} Kz</td>
                {isAdmin && (
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <button 
                      onClick={() => viewSale(sale)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.5rem', color: 'var(--primary)' }}
                    >
                      <Eye size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(sale.id)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.5rem', color: 'var(--danger)' }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {filteredSales.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            <p>Nenhuma venda encontrada</p>
          </div>
        )}
      </div>

      {showModal && selectedSale && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>Venda #{selectedSale.id}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              {selectedSale.data} • {selectedSale.cliente_nome || 'Consumidor direto'}
            </p>

            {loadingItems ? (
              <p>A carregar...</p>
            ) : (
              <div style={{ marginBottom: '1.5rem' }}>
                {saleItems.map((item, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '0.75rem 0',
                    borderBottom: '1px solid var(--glass-border)'
                  }}>
                    <span>{item.quantidade}x {item.produto_nome}</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{fmt(item.preco_unitario * item.quantidade)} Kz</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '1rem',
              background: 'var(--bg-secondary)',
              borderRadius: '12px',
              marginBottom: '1.5rem'
            }}>
              <span style={{ fontWeight: 600 }}>Total</span>
              <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{fmt(selectedSale.total)} Kz</span>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn-secondary" onClick={() => setShowModal(false)} style={{ flex: 1 }}>
                Fechar
              </button>
              {isAdmin && (
                <button 
                  onClick={() => handleDelete(selectedSale.id)}
                  style={{ flex: 1, background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '12px', padding: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <Trash2 size={16} /> Eliminar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}