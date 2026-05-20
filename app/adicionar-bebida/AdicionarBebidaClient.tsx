'use client';

import { useState } from 'react';
import { Plus, Trash2, Wine, Edit3, X, Check, AlertTriangle } from 'lucide-react';
import styles from './AdicionarBebida.module.css';
import { addPosProduct, updatePosProduct, removePosProduct } from './actions';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';

interface PosProduct {
  id: number;
  produto_id: number;
  preco_venda: number;
  nome: string;
  estoque_atual: number;
}

export default function AdicionarBebidaClient({ 
  posProducts, 
  availableProducts 
}: { 
  posProducts: PosProduct[];
  availableProducts: any[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<PosProduct | null>(null);
  const [addForm, setAddForm] = useState({ produtoId: '', preco: '' });

  const handleAddProduct = async () => {
    if (!addForm.produtoId || !addForm.preco) {
      showToast('Preencha todos os campos', 'error');
      return;
    }
    
    setSaving(true);
    const result = await addPosProduct(parseInt(addForm.produtoId), parseFloat(addForm.preco));
    if (result.success) {
      showToast('Bebida adicionada ao catálogo de vendas!', 'success');
      setShowAddModal(false);
      setAddForm({ produtoId: '', preco: '' });
      router.refresh();
    } else {
      showToast(result.error || 'Erro ao adicionar', 'error');
    }
    setSaving(false);
  };

  const handleUpdatePrice = async (id: number, newPrice: number) => {
    if (newPrice <= 0 || isNaN(newPrice)) {
      showToast('Insira um preço de venda válido', 'error');
      return;
    }
    
    const result = await updatePosProduct(id, newPrice);
    if (result.success) {
      showToast('Preço de venda atualizado com sucesso!', 'success');
      setEditingProduct(null);
      router.refresh();
    } else {
      showToast(result.error || 'Erro ao atualizar preço', 'error');
    }
  };

  const handleRemoveProduct = async (id: number, nome: string) => {
    if (!confirm(`Remover "${nome}" do catálogo de vendas?`)) return;
    
    const result = await removePosProduct(id);
    if (result.success) {
      showToast('Bebida removida do catálogo de vendas!', 'success');
      router.refresh();
    } else {
      showToast(result.error || 'Erro ao remover', 'error');
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Wine size={32} />
        <div>
          <h1>Catálogo de Vendas (POS)</h1>
          <p>Escolha quais bebidas aparecem no terminal de vendas e defina o preço de venda</p>
        </div>
      </header>

      <div className={styles.section}>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: '40%' }}>Bebida</th>
                <th style={{ width: '20%', textAlign: 'center' }}>Estoque</th>
                <th style={{ width: '25%', textAlign: 'right' }}>Preço Venda</th>
                <th style={{ width: '15%', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {posProducts.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 500 }}>{p.nome}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`${styles.stockBadge} ${p.estoque_atual < 10 ? styles.stockAlert : styles.stockNormal}`}>
                      {p.estoque_atual} un
                    </span>
                  </td>
                  <td>
                    {editingProduct?.id === p.id ? (
                      <div className={styles.priceWrapper}>
                        <input
                          type="number"
                          value={editingProduct.preco_venda}
                          onChange={(e) => setEditingProduct({ ...editingProduct, preco_venda: parseFloat(e.target.value) || 0 })}
                          className={styles.priceInput}
                          autoFocus
                          min="1"
                        />
                        <button 
                          onClick={() => handleUpdatePrice(p.id, editingProduct.preco_venda)}
                          className={`${styles.actionBtn} ${styles.btnCheck}`}
                          title="Confirmar"
                        >
                          <Check size={16} />
                        </button>
                        <button 
                          onClick={() => setEditingProduct(null)}
                          className={`${styles.actionBtn} ${styles.btnCancel}`}
                          title="Cancelar"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className={styles.priceWrapper}>
                        <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{p.preco_venda.toLocaleString('pt-AO')} Kz</span>
                        <button 
                          onClick={() => setEditingProduct(p)}
                          className={`${styles.actionBtn} ${styles.btnEdit}`}
                          title="Editar Preço"
                        >
                          <Edit3 size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button 
                      onClick={() => handleRemoveProduct(p.id, p.nome)}
                      className={`${styles.actionBtn} ${styles.btnDelete}`}
                      title="Remover Bebida da POS"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {posProducts.length === 0 && (
            <div className={styles.emptyState}>
              <Wine size={48} className={styles.emptyIcon} />
              <p style={{ fontWeight: 500, fontSize: '1rem', color: 'var(--text)' }}>Nenhuma bebida no catálogo</p>
              <p style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>Adicione bebidas para poder realizar vendas no POS</p>
            </div>
          )}

          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-start' }}>
            <button 
              className="btn-primary" 
              onClick={() => setShowAddModal(true)}
            >
              <Plus size={18} />
              Adicionar Bebida para Venda
            </button>
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2>Adicionar Bebida à POS</h2>

            <div className={styles.formGroup}>
              <label>Bebida</label>
              {availableProducts.length === 0 ? (
                <div style={{
                  padding: '1rem',
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid var(--warning)',
                  borderRadius: '12px',
                  color: 'var(--warning)',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                  lineHeight: '1.4'
                }}>
                  <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                  <div>
                    <strong>Nenhuma bebida disponível!</strong>
                    <span style={{ display: 'block', marginTop: '0.25rem', color: 'var(--text-secondary)' }}>
                      Você precisa primeiro registar uma compra de grade/grosso no menu <strong>Compra</strong> antes de poder ativá-la para venda.
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  <select
                    value={addForm.produtoId}
                    onChange={(e) => setAddForm({ ...addForm, produtoId: e.target.value })}
                    className={styles.select}
                  >
                    <option value="">Selecione uma bebida</option>
                    {availableProducts.map(p => (
                      <option key={p.id} value={p.id}>{p.nome} (Stock: {p.estoque_atual} un)</option>
                    ))}
                  </select>
                  <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '0.4rem', fontSize: '0.75rem', lineHeight: '1.3' }}>
                    * Apenas bebidas compradas a grosso (com histórico de compras) aparecem nesta lista.
                  </small>
                </>
              )}
            </div>

            <div className={styles.formGroup}>
              <label>Preço de Venda (Kz)</label>
              <input
                type="number"
                value={addForm.preco}
                onChange={(e) => setAddForm({ ...addForm, preco: e.target.value })}
                placeholder="Ex: 350"
                className={styles.input}
                min="1"
                disabled={availableProducts.length === 0}
              />
            </div>

            <div className={styles.actionsRow}>
              <button 
                className={styles.btnSecondary} 
                onClick={() => setShowAddModal(false)}
              >
                Cancelar
              </button>
              <button 
                className={styles.btnPrimary} 
                onClick={handleAddProduct} 
                disabled={saving || availableProducts.length === 0}
              >
                {saving ? 'Adicionando...' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
