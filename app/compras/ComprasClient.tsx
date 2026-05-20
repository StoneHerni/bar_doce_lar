'use client';

import { useState } from 'react';
import { Plus, Trash2, ShoppingCart, Eye, Package } from 'lucide-react';
import { createPurchase, deletePurchase } from './actions';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';

interface Item {
  produtoId: number;
  quantidade: number;
  precoUnitario: number;
}

export default function ComprasClient({ initialCompras, fornecedores, produtos }: { 
  initialCompras: any[]; 
  fornecedores: any[];
  produtos: any[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [compras, setCompras] = useState(initialCompras);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCompra, setSelectedCompra] = useState<any>(null);
  const [compraItems, setCompraItems] = useState<any[]>([]);
  const [form, setForm] = useState({
    fornecedorId: '',
    items: [] as Item[]
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const total = form.items.reduce((sum, item) => sum + (item.quantidade * item.precoUnitario), 0);

  const addItem = () => {
    setForm({
      ...form,
      items: [...form.items, { produtoId: 0, quantidade: 1, precoUnitario: 0 }]
    });
  };

  const removeItem = (index: number) => {
    setForm({
      ...form,
      items: form.items.filter((_, i) => i !== index)
    });
  };

  const updateItem = (index: number, field: keyof Item, value: number) => {
    const newItems = [...form.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setForm({ ...form, items: newItems });
  };

  const handleCreate = async () => {
    if (!form.fornecedorId || form.items.length === 0) {
      showToast('Preencha todos os campos', 'error');
      return;
    }
    
    setIsProcessing(true);
    const result = await createPurchase({
      fornecedorId: parseInt(form.fornecedorId),
      items: form.items,
      total
    });

    if (result.success) {
      showToast('Compra registada!', 'success');
      setShowModal(false);
      setForm({ fornecedorId: '', items: [] });
      router.refresh();
    } else {
      showToast(result.error || 'Erro', 'error');
    }
    setIsProcessing(false);
  };

  const viewDetails = async (compra: any) => {
    setSelectedCompra(compra);
    const res = await fetch(`/api/compras/${compra.id}`);
    const items = await res.json();
    setCompraItems(items);
    setShowDetailModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Eliminar esta compra?')) return;
    const result = await deletePurchase(id);
    if (result.success) {
      showToast('Compra eliminada!', 'success');
      router.refresh();
    } else {
      showToast(result.error || 'Erro', 'error');
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.25rem' }}>Compras / Fornecimentos</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Registar compras de fornecedores</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={18} />
          Nova Compra
        </button>
      </header>

      <div className="glass-card">
        {compras.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            <ShoppingCart size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <p>Nenhuma compra registada</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Data</th>
                <th style={{ textAlign: 'left', padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Fornecedor</th>
                <th style={{ textAlign: 'right', padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Total</th>
                <th style={{ textAlign: 'right', padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {compras.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '1rem' }}>{c.data}</td>
                  <td style={{ padding: '1rem', fontWeight: 500 }}>{c.fornecedor_nome || 'N/A'}</td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>{c.total.toLocaleString('pt-AO')} Kz</td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <button 
                      className="btn-icon" 
                      onClick={() => viewDetails(c)}
                      style={{ color: 'var(--primary)' }}
                    >
                      <Eye size={18} />
                    </button>
                    <button 
                      className="btn-icon" 
                      onClick={() => handleDelete(c.id)}
                      style={{ color: 'var(--danger)', marginLeft: '0.5rem' }}
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
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflow: 'auto' }}>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Nova Compra</h2>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Fornecedor</label>
              <select
                value={form.fornecedorId}
                onChange={e => setForm({ ...form, fornecedorId: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  border: '1px solid var(--glass-border)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '1rem'
                }}
              >
                <option value="">Selecionar fornecedor</option>
                {fornecedores.map(f => (
                  <option key={f.id} value={f.id}>{f.nome}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Produtos</label>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={addItem}
                  style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                >
                  <Plus size={14} /> Adicionar
                </button>
              </div>

              {form.items.length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '1rem' }}>
                  Nenhum produto adicionado
                </p>
              )}

              {form.items.map((item, index) => (
                <div key={index} style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 80px 100px 40px',
                  gap: '0.5rem',
                  marginBottom: '0.5rem',
                  alignItems: 'center'
                }}>
                  <select
                    value={item.produtoId}
                    onChange={e => updateItem(index, 'produtoId', parseInt(e.target.value))}
                    style={{
                      padding: '0.5rem',
                      borderRadius: '8px',
                      border: '1px solid var(--glass-border)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value={0}>Produto</option>
                    {produtos.map(p => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={item.quantidade}
                    onChange={e => updateItem(index, 'quantidade', parseInt(e.target.value) || 0)}
                    placeholder="Qtd"
                    style={{
                      padding: '0.5rem',
                      borderRadius: '8px',
                      border: '1px solid var(--glass-border)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem'
                    }}
                  />
                  <input
                    type="number"
                    value={item.precoUnitario}
                    onChange={e => updateItem(index, 'precoUnitario', parseFloat(e.target.value) || 0)}
                    placeholder="Preço"
                    style={{
                      padding: '0.5rem',
                      borderRadius: '8px',
                      border: '1px solid var(--glass-border)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
                      fontSize: '0.875rem'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--danger)',
                      cursor: 'pointer',
                      padding: '0.25rem'
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem',
              background: 'var(--bg-secondary)',
              borderRadius: '12px',
              marginBottom: '1.5rem'
            }}>
              <span style={{ fontWeight: 500 }}>Total</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>
                {total.toLocaleString('pt-AO')} Kz
              </span>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn-secondary" onClick={() => setShowModal(false)} style={{ flex: 1 }}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={handleCreate} disabled={isProcessing} style={{ flex: 1 }}>
                {isProcessing ? 'Salvando...' : 'Registar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetailModal && selectedCompra && (
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
          <div className="glass-card" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
            <h2 style={{ marginBottom: '0.5rem' }}>Compra #{selectedCompra.id}</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              {selectedCompra.data} - {selectedCompra.fornecedor_nome}
            </p>

            <div style={{ marginBottom: '1.5rem' }}>
              {compraItems.map((item, i) => (
                <div key={i} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '0.75rem 0',
                  borderBottom: '1px solid var(--glass-border)'
                }}>
                  <span>{item.produto_nome}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {item.quantidade_garrafas} x {item.preco_grade.toLocaleString('pt-AO')} Kz
                  </span>
                </div>
              ))}
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: 700,
              fontSize: '1.1rem'
            }}>
              <span>Total</span>
              <span style={{ color: 'var(--primary)' }}>{selectedCompra.total.toLocaleString('pt-AO')} Kz</span>
            </div>

            <button 
              className="btn-secondary" 
              onClick={() => setShowDetailModal(false)}
              style={{ width: '100%', marginTop: '1.5rem' }}
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}