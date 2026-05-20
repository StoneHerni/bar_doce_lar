'use client';

import { useState } from 'react';
import { 
  PackagePlus, 
  Trash2, 
  Search, 
  AlertTriangle,
  Edit3,
  X,
  Plus,
  TrendingUp,
  TrendingDown,
  AlertCircle
} from 'lucide-react';
import styles from './Inventory.module.css';
import { createProduct, updateProduct, deleteProduct, addStock, registerLoss, savePrecosProduto } from './actions';
import { getGrades } from '../grades/actions';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';

const fmt = (n: number) => Math.round(n).toLocaleString('pt-AO');

interface Product {
  id: number;
  nome: string;
  preco: number;
  estoque_atual: number;
  estoque_minimo: number;
  grade_id: number | null;
  garrafas_por_grade: number;
}

interface Grade {
  id: number;
  nome: string;
  garrafas_por_grade: number;
}

interface Movimento {
  produto_nome: string;
  tipo: 'entrada' | 'saida' | 'perda';
  quantidade: number;
  data: string;
  descricao: string;
}

interface PrecoQtd {
  id: number;
  produto_id: number;
  quantidade_minima: number;
  preco: number;
}

export default function InventoryClient({ initialProducts, userRole, initialGrades, movimentos, precosQuantidade }: { initialProducts: Product[], userRole: 'admin' | 'funcionario', initialGrades?: Grade[], movimentos?: Movimento[], precosQuantidade?: PrecoQtd[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalType, setModalType] = useState<'stock' | 'loss' | 'create' | 'edit' | 'preco' | 'precoQtd' | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [reason, setReason] = useState('vencido');
  const [isProcessing, setIsProcessing] = useState(false);
  const [productForm, setProductForm] = useState({ nome: '', preco: '', estoque: '', estoqueMinimo: '10', gradeId: '' });
  const [grades, setGrades] = useState<Grade[]>(initialGrades || []);
  const [precoQtdForm, setPrecoQtdForm] = useState<{ quantidade_minima: number; preco: number }[]>([]);

  const isAdmin = userRole === 'admin';

  const filteredProducts = initialProducts.filter(p => 
    p.nome.toLowerCase().includes(search.toLowerCase())
  );

  const handleGradeSelect = (gradeIdStr: string) => {
    if (gradeIdStr === '') {
      setProductForm({
        ...productForm,
        gradeId: '',
        nome: ''
      });
    } else {
      const selectedGrade = grades.find(g => g.id.toString() === gradeIdStr);
      setProductForm({
        ...productForm,
        gradeId: gradeIdStr,
        nome: selectedGrade ? selectedGrade.nome : productForm.nome
      });
    }
  };

  const handleAction = async () => {
    if (!selectedProduct || amount <= 0) return;
    
    setIsProcessing(true);
    let result;
    
    if (modalType === 'stock') {
      result = await addStock(selectedProduct.id, amount);
    } else {
      result = await registerLoss(selectedProduct.id, amount, reason);
    }

    if (result.success) {
      showToast(modalType === 'stock' ? 'Estoque adicionado!' : 'Perda registrada!', 'success');
      setModalType(null);
      setSelectedProduct(null);
      setAmount(0);
      router.refresh();
    } else {
      showToast(`Erro: ${result.error}`, 'error');
    }
    setIsProcessing(false);
  };

  const handleCreateProduct = async () => {
    if (!productForm.nome || !productForm.preco) return;
    setIsProcessing(true);
    
    const result = await createProduct(
      productForm.nome,
      parseFloat(productForm.preco),
      parseInt(productForm.estoque) || 0,
      parseInt(productForm.estoqueMinimo) || 10,
      productForm.gradeId ? parseInt(productForm.gradeId) : undefined
    );

    if (result.success) {
      showToast('Produto criado com sucesso!', 'success');
      setModalType(null);
      setProductForm({ nome: '', preco: '', estoque: '', estoqueMinimo: '10', gradeId: '' });
      router.refresh();
    } else {
      showToast(result.error || 'Erro ao criar', 'error');
    }
    setIsProcessing(false);
  };

  const handleUpdateProduct = async () => {
    if (!selectedProduct || !productForm.nome || !productForm.preco) return;
    setIsProcessing(true);
    
    const result = await updateProduct(
      selectedProduct.id,
      productForm.nome,
      parseFloat(productForm.preco),
      parseInt(productForm.estoqueMinimo) || 10,
      productForm.gradeId ? parseInt(productForm.gradeId) : null
    );

    if (result.success) {
      showToast('Produto atualizado!', 'success');
      setModalType(null);
      setSelectedProduct(null);
      setProductForm({ nome: '', preco: '', estoque: '', estoqueMinimo: '10', gradeId: '' });
      router.refresh();
    } else {
      showToast(result.error || 'Erro ao atualizar', 'error');
    }
    setIsProcessing(false);
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!confirm(`Tem certeza que deseja eliminar "${product.nome}"?`)) return;
    
    const result = await deleteProduct(product.id);
    if (result.success) {
      showToast('Produto eliminado!', 'success');
      router.refresh();
    } else {
      showToast(result.error || 'Erro ao eliminar', 'error');
    }
  };

  const openEditModal = (product: Product) => {
    setSelectedProduct(product);
    setProductForm({
      nome: product.nome,
      preco: product.preco.toString(),
      estoque: '',
      estoqueMinimo: product.estoque_minimo.toString(),
      gradeId: product.grade_id?.toString() || ''
    });
    setModalType('edit');
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1>{isAdmin ? 'Gestão de Estoque' : 'Ver Estoque'}</h1>
          <p>Monitorize e atualize os níveis de produtos.</p>
        </div>
      </header>

      <div className={styles.controls}>
        <div className={styles.searchBar}>
          <Search size={20} color="var(--text-secondary)" />
          <input 
            type="text" 
            placeholder="Pesquisar produto..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {isAdmin && (
          <button 
            className="btn-primary" 
            onClick={() => setModalType('create')}
          >
            <Plus size={18} /> Novo Produto
          </button>
        )}
      </div>

      <div className="glass-card">
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Produto</th>
              <th>Preço</th>
              <th>Estoque</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map(product => {
              const isLow = product.estoque_atual < product.estoque_minimo;
              return (
                <tr key={product.id}>
                  <td className={styles.productName}>{product.nome}</td>
                  <td>{product.preco.toLocaleString('pt-AO') + ' Kz'}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{product.estoque_atual} un</div>
                    {product.grade_id && product.garrafas_por_grade > 1 && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                        {Math.floor(product.estoque_atual / product.garrafas_por_grade)} cx + {product.estoque_atual % product.garrafas_por_grade} un
                      </div>
                    )}
                  </td>
                  <td>
                    {isLow ? (
                      <span className={`${styles.status} ${styles.low}`}>
                        <AlertTriangle size={14} /> Estoque Baixo
                      </span>
                    ) : (
                      <span className={`${styles.status} ${styles.normal}`}>Normal</span>
                    )}
                  </td>
                  <td>
                    <div className={styles.actions}>
                      {isAdmin && (
                        <>
                          <button
                            className={styles.actionBtn}
                            title="Definir Preço"
                            style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.8rem' }}
                            onClick={() => {
                              setSelectedProduct(product);
                              setProductForm({ ...productForm, preco: product.preco.toString() });
                              setModalType('preco');
                            }}
                          >
                            Kz
                          </button>
                          <button
                            className={styles.actionBtn}
                            title="Preços por Quantidade"
                            style={{ color: 'var(--success)', fontWeight: 700, fontSize: '0.75rem' }}
                            onClick={() => {
                              setSelectedProduct(product);
                              const existing = (precosQuantidade || []).filter(p => p.produto_id === product.id);
                              setPrecoQtdForm(existing.length > 0 ? existing : [{ quantidade_minima: 3, preco: 0 }]);
                              setModalType('precoQtd');
                            }}
                          >
                            3x
                          </button>
                          <button 
                            className={styles.actionBtn} 
                            title="Editar"
                            onClick={() => openEditModal(product)}
                          >
                            <Edit3 size={18} />
                          </button>
                          <button 
                            className={styles.actionBtn} 
                            title="Adicionar Estoque"
                            onClick={() => {
                              setSelectedProduct(product);
                              setModalType('stock');
                            }}
                          >
                            <PackagePlus size={18} />
                          </button>
                          <button 
                            className={styles.actionBtn} 
                            title="Registrar Perda"
                            onClick={() => {
                              setSelectedProduct(product);
                              setModalType('loss');
                            }}
                          >
                            <Trash2 size={18} />
                          </button>
                          <button 
                            className={`${styles.actionBtn} ${styles.deleteBtn}`}
                            title="Eliminar"
                            onClick={() => handleDeleteProduct(product)}
                          >
                            <X size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {movimentos && movimentos.length > 0 && (
        <div className="glass-card" style={{ marginTop: '2rem' }}>
          <h2 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 600 }}>Últimos Movimentos</h2>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Data</th>
                <th>Produto</th>
                <th>Tipo</th>
                <th>Quantidade</th>
                <th>Descrição</th>
              </tr>
            </thead>
            <tbody>
              {movimentos.map((m, i) => (
                <tr key={i}>
                  <td>{m.data}</td>
                  <td>{m.produto_nome}</td>
                  <td>
                    {m.tipo === 'entrada' && <span style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><TrendingUp size={14} /> Entrada</span>}
                    {m.tipo === 'saida' && <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><TrendingDown size={14} /> Venda</span>}
                    {m.tipo === 'perda' && <span style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><AlertCircle size={14} /> Perda</span>}
                  </td>
                  <td style={{ fontWeight: 600, color: m.tipo === 'entrada' ? 'var(--success)' : m.tipo === 'perda' ? 'var(--danger)' : 'var(--text)' }}>
                    {m.tipo === 'entrada' ? '+' : '-'}{m.quantidade} un
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{m.descricao}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalType && selectedProduct && (modalType === 'stock' || modalType === 'loss') && (
        <div className={styles.modalOverlay}>
          <div className={`glass-card ${styles.modal}`}>
            <h2>{modalType === 'stock' ? 'Adicionar Estoque' : 'Registrar Perda'}</h2>
            <p className={styles.modalSub}>{selectedProduct.nome}</p>
            
            <div className={styles.formGroup}>
              <label>Quantidade</label>
              <input 
                type="number" 
                value={amount} 
                onChange={(e) => setAmount(Number(e.target.value))}
                min="1"
              />
            </div>

            {modalType === 'loss' && (
              <div className={styles.formGroup}>
                <label>Motivo</label>
                <select value={reason} onChange={(e) => setReason(e.target.value)}>
                  <option value="vencido">Vencido</option>
                  <option value="quebrado">Quebrado</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
            )}

            <div className={styles.modalActions}>
              <button className="btn-secondary" onClick={() => setModalType(null)}>Cancelar</button>
              <button className="btn-primary" onClick={handleAction} disabled={isProcessing}>
                {isProcessing ? 'Processando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalType === 'create' && (
        <div className={styles.modalOverlay}>
          <div className={`glass-card ${styles.modal}`}>
            <h2>Novo Produto</h2>
            
            <div className={styles.formGroup}>
              <label>Grade (Embalagem)</label>
              <select 
                value={productForm.gradeId} 
                onChange={(e) => handleGradeSelect(e.target.value)}
              >
                <option value="">Sem grade</option>
                {grades.map(g => (
                  <option key={g.id} value={g.id}>{g.nome} ({g.garrafas_por_grade} un)</option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Nome do Produto</label>
              <input 
                type="text" 
                value={productForm.nome} 
                onChange={(e) => setProductForm({...productForm, nome: e.target.value})}
                placeholder="Ex: Coca-Cola"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Preço de Custo (Kz)</label>
              <input 
                type="number" 
                value={productForm.preco} 
                onChange={(e) => setProductForm({...productForm, preco: e.target.value})}
                placeholder="0"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Estoque Inicial (Garrafas)</label>
              <input 
                type="number" 
                value={productForm.estoque} 
                onChange={(e) => setProductForm({...productForm, estoque: e.target.value})}
                placeholder="0"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Estoque Mínimo (Garrafas)</label>
              <input 
                type="number" 
                value={productForm.estoqueMinimo} 
                onChange={(e) => setProductForm({...productForm, estoqueMinimo: e.target.value})}
              />
            </div>

            <div className={styles.modalActions}>
              <button className="btn-secondary" onClick={() => { setModalType(null); setProductForm({ nome: '', preco: '', estoque: '', estoqueMinimo: '10', gradeId: '' }); }}>Cancelar</button>
              <button className="btn-primary" onClick={handleCreateProduct} disabled={isProcessing}>
                {isProcessing ? 'Criando...' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalType === 'preco' && selectedProduct && (
        <div className={styles.modalOverlay}>
          <div className={`glass-card ${styles.modal}`}>
            <h2>Definir Preço de Venda</h2>
            <p className={styles.modalSub}>{selectedProduct.nome}</p>
            <div className={styles.formGroup}>
              <label>Preço (Kz)</label>
              <input
                type="number"
                value={productForm.preco}
                onChange={(e) => setProductForm({ ...productForm, preco: e.target.value })}
                min="0"
                step="0.01"
                autoFocus
              />
            </div>
            <div className={styles.modalActions}>
              <button className="btn-secondary" onClick={() => { setModalType(null); setSelectedProduct(null); }}>Cancelar</button>
              <button className="btn-primary" onClick={async () => {
                if (!selectedProduct || !productForm.preco) return;
                setIsProcessing(true);
                const result = await updateProduct(
                  selectedProduct.id,
                  selectedProduct.nome,
                  parseFloat(productForm.preco),
                  selectedProduct.estoque_minimo,
                  selectedProduct.grade_id
                );
                if (result.success) {
                  showToast('Preço atualizado!', 'success');
                  setModalType(null);
                  setSelectedProduct(null);
                  router.refresh();
                } else {
                  showToast(result.error || 'Erro', 'error');
                }
                setIsProcessing(false);
              }} disabled={isProcessing}>
                {isProcessing ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalType === 'edit' && selectedProduct && (
        <div className={styles.modalOverlay}>
          <div className={`glass-card ${styles.modal}`}>
            <h2>Editar Produto</h2>
            <p className={styles.modalSub}>Estoque atual: {selectedProduct.estoque_atual} un</p>
            
            <div className={styles.formGroup}>
              <label>Grade (Embalagem)</label>
              <select 
                value={productForm.gradeId} 
                onChange={(e) => handleGradeSelect(e.target.value)}
              >
                <option value="">Sem grade</option>
                {grades.map(g => (
                  <option key={g.id} value={g.id}>{g.nome} ({g.garrafas_por_grade} un)</option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Nome</label>
              <input 
                type="text" 
                value={productForm.nome} 
                onChange={(e) => setProductForm({...productForm, nome: e.target.value})}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Preço (Kz)</label>
              <input 
                type="number" 
                value={productForm.preco} 
                onChange={(e) => setProductForm({...productForm, preco: e.target.value})}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Estoque Mínimo</label>
              <input 
                type="number" 
                value={productForm.estoqueMinimo} 
                onChange={(e) => setProductForm({...productForm, estoqueMinimo: e.target.value})}
              />
            </div>

            <div className={styles.modalActions}>
              <button className="btn-secondary" onClick={() => { setModalType(null); setSelectedProduct(null); }}>Cancelar</button>
              <button className="btn-primary" onClick={handleUpdateProduct} disabled={isProcessing}>
                {isProcessing ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalType === 'precoQtd' && selectedProduct && (
        <div className={styles.modalOverlay}>
          <div className={`glass-card ${styles.modal}`} style={{ maxWidth: '450px' }}>
            <h2>Promoção / Preço por Quantidade</h2>
            <p className={styles.modalSub}>{selectedProduct.nome} (Preço normal: {selectedProduct.preco.toLocaleString('pt-AO')} Kz)</p>
            
            <div style={{ margin: '1.5rem 0', maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {precoQtdForm.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center', padding: '1rem' }}>
                  Nenhuma promoção configurada.
                </p>
              ) : (
                precoQtdForm.map((rule, idx) => (
                  <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 40px', gap: '0.5rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Leve:</span>
                      <input
                        type="number"
                        value={rule.quantidade_minima}
                        onChange={(e) => {
                          const val = Math.max(1, parseInt(e.target.value) || 0);
                          const updated = [...precoQtdForm];
                          updated[idx].quantidade_minima = val;
                          setPrecoQtdForm(updated);
                        }}
                        style={{ width: '60px', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', textAlign: 'center' }}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Por (Kz):</span>
                      <input
                        type="number"
                        value={rule.preco}
                        onChange={(e) => {
                          const val = Math.max(0, parseFloat(e.target.value) || 0);
                          const updated = [...precoQtdForm];
                          updated[idx].preco = val;
                          setPrecoQtdForm(updated);
                        }}
                        style={{ width: '100px', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--glass-border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', textAlign: 'center' }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setPrecoQtdForm(precoQtdForm.filter((_, i) => i !== idx))}
                      style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', display: 'flex', justifyContent: 'center' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => setPrecoQtdForm([...precoQtdForm, { quantidade_minima: 3, preco: 1000 }])}
              style={{ width: '100%', marginBottom: '1.5rem', fontSize: '0.875rem', padding: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
            >
              <Plus size={14} /> Adicionar Nova Promoção
            </button>

            <div className={styles.modalActions}>
              <button className="btn-secondary" onClick={() => { setModalType(null); setSelectedProduct(null); }}>Cancelar</button>
              <button
                className="btn-primary"
                disabled={isProcessing}
                onClick={async () => {
                  if (!selectedProduct) return;
                  setIsProcessing(true);
                  const validRules = precoQtdForm.filter(r => r.quantidade_minima > 0 && r.preco > 0);
                  const result = await savePrecosProduto(selectedProduct.id, validRules);
                  if (result.success) {
                    showToast('Preços promocionais configurados!', 'success');
                    setModalType(null);
                    setSelectedProduct(null);
                    router.refresh();
                  } else {
                    showToast(result.error || 'Erro ao salvar', 'error');
                  }
                  setIsProcessing(false);
                }}
              >
                {isProcessing ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
