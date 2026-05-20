'use client';

import { useState } from 'react';
import { ArrowLeft, Download, ClipboardList, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { deleteFecho } from './actions';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';

interface Fecho {
  id: number;
  data: string;
  observacao: string;
  created_at: string;
  funcionario_nome: string;
}

interface Item {
  fecho_id: number;
  produto_nome: string;
  quantidade: number;
}

export default function HistoricoFechoClient({ fechos, itens, userTipo }: { fechos: Fecho[]; itens: Item[]; userTipo: 'admin' | 'funcionario' }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<Fecho | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const downloadPDF = (fecho: Fecho) => {
    const doc = new jsPDF();
    const fechoItens = itens.filter(i => i.fecho_id === fecho.id);

    doc.setFontSize(18);
    doc.text('Bar Doce Lar', 14, 20);
    doc.setFontSize(13);
    doc.text('Fecho do Turno', 14, 30);
    doc.setFontSize(10);
    doc.text(`Data: ${fecho.data}`, 14, 40);
    doc.text(`Funcionário: ${fecho.funcionario_nome}`, 14, 47);
    doc.text(`Gerado em: ${new Date(fecho.created_at).toLocaleString('pt-AO')}`, 14, 54);
    if (fecho.observacao) doc.text(`Observação: ${fecho.observacao}`, 14, 61);

    autoTable(doc, {
      startY: fecho.observacao ? 68 : 62,
      head: [['Produto', 'Quantidade']],
      body: fechoItens.map(i => [i.produto_nome, `${i.quantidade} un`]),
      styles: { fontSize: 10 },
      headStyles: { fillColor: [212, 175, 55], textColor: 0 },
    });

    doc.save(`fecho_${fecho.data}_${fecho.id}.pdf`);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsProcessing(true);
    const result = await deleteFecho(deleteTarget.id);
    if (result.success) {
      showToast('Fecho eliminado!', 'success');
      setDeleteTarget(null);
      router.refresh();
    } else {
      showToast(`Erro: ${result.error}`, 'error');
    }
    setIsProcessing(false);
  };

  const backHref = userTipo === 'admin' ? '/' : '/fecho';

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Link href={backHref} style={{ color: 'var(--text-secondary)', display: 'flex' }}>
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Histórico de Fechos</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            {userTipo === 'admin' ? 'Visualize e elimine fechos de turno' : 'Descarregue os fechos em PDF'}
          </p>
        </div>
      </div>

      {fechos.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          <ClipboardList size={48} strokeWidth={1} style={{ margin: '0 auto 1rem' }} />
          <p>Nenhum fecho registado ainda.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {fechos.map(fecho => {
            const fechoItens = itens.filter(i => i.fecho_id === fecho.id);
            return (
              <div key={fecho.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{fecho.data}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {fecho.funcionario_nome} · {fechoItens.length} produtos
                  </div>
                  {fecho.observacao && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      {fecho.observacao}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => downloadPDF(fecho)}>
                    <Download size={16} /> PDF
                  </button>
                  {userTipo === 'admin' && (
                    <button
                      className="btn-secondary"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                      onClick={() => setDeleteTarget(fecho)}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-card" style={{ minWidth: '360px', padding: '2rem' }}>
            <h2 style={{ marginBottom: '0.75rem' }}>Eliminar Fecho</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Tem a certeza que quer eliminar o fecho de <strong>{deleteTarget.data}</strong> ({deleteTarget.funcionario_nome})?
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setDeleteTarget(null)}>Cancelar</button>
              <button className="btn-primary" style={{ background: 'var(--danger)', color: '#fff' }} onClick={handleDelete} disabled={isProcessing}>
                {isProcessing ? 'Eliminando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
