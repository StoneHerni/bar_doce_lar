'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Package, Phone } from 'lucide-react';
import { createFornecedor, deleteFornecedor } from './actions';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';

export default function FornecedoresClient({ initialFornecedores }: { initialFornecedores: any[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [fornecedores, setFornecedores] = useState(initialFornecedores);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    setFornecedores(initialFornecedores);
  }, [initialFornecedores]);
  const [form, setForm] = useState({ nome: '', telefone: '' });
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCreate = async () => {
    if (!form.nome) return;
    setIsProcessing(true);
    const result = await createFornecedor(form.nome, form.telefone);
    if (result.success) {
      showToast('Fornecedor criado!', 'success');
      setShowModal(false);
      setForm({ nome: '', telefone: '' });
      router.refresh();
    } else {
      showToast(result.error || 'Erro', 'error');
    }
    setIsProcessing(false);
  };

  const handleDelete = async (id: number, nome: string) => {
    if (!confirm(`Eliminar fornecedor "${nome}"?`)) return;
    const result = await deleteFornecedor(id);
    if (result.success) {
      showToast('Fornecedor eliminado!', 'success');
      router.refresh();
    } else {
      showToast(result.error || 'Erro', 'error');
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.25rem' }}>Fornecedores</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Gestão de fornecedores</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} />
          Novo Fornecedor
        </button>
      </header>

      <div className="glass-card">
        {fornecedores.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            <Package size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <p>Nenhum fornecedor cadastrado</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Nome</th>
                <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Telefone</th>
                <th style={{ textAlign: 'right', padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {fornecedores.map(f => (
                <tr key={f.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '1rem', fontWeight: 500 }}>{f.nome}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                    {f.telefone ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Phone size={14} /> {f.telefone}
                      </span>
                    ) : '-'}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <button 
                      className="btn-icon" 
                      onClick={() => handleDelete(f.id, f.nome)}
                      style={{ color: 'var(--danger)' }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Novo Fornecedor</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Nome</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={e => setForm({ ...form, nome: e.target.value })}
                  placeholder="Nome do fornecedor"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '12px',
                    border: '1px solid var(--glass-border)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Telefone</label>
                <input
                  type="text"
                  value={form.telefone}
                  onChange={e => setForm({ ...form, telefone: e.target.value })}
                  placeholder="925 000 000"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '12px',
                    border: '1px solid var(--glass-border)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '1rem'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button className="btn-secondary" onClick={() => setShowModal(false)} style={{ flex: 1 }}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={handleCreate} disabled={isProcessing} style={{ flex: 1 }}>
                {isProcessing ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}