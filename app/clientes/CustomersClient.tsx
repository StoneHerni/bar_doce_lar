'use client';

import { useState } from 'react';
import { 
  Search, 
  DollarSign, 
  UserPlus,
  Phone,
  Trash2,
  Bell,
  Calendar
} from 'lucide-react';
import styles from './Customers.module.css';
import { payDebt, createCustomer, deleteCustomer } from './actions';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';

const fmt = (n: number) => Math.round(n).toLocaleString('pt-AO');

interface Customer {
  id: number;
  nome: string;
  telefone: string;
  limite_credito: number;
  divida_total: number;
  prazo_pagamento: string | null;
}

export default function CustomersClient({ initialCustomers, userTipo }: { initialCustomers: Customer[], userTipo: 'admin' | 'funcionario' }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [amount, setAmount] = useState<number>(0);
  
  const [newCustomer, setNewCustomer] = useState({ nome: '', telefone: '', limite: 5000, prazo: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);

  const today = new Date().toISOString().split('T')[0];

  const overdueCustomers = initialCustomers.filter(c => c.prazo_pagamento && c.prazo_pagamento <= today);

  const filteredCustomers = initialCustomers.filter(c => 
    c.nome.toLowerCase().includes(search.toLowerCase())
  );

  const handlePayment = async () => {
    if (!selectedCustomer || amount <= 0) return;
    
    setIsProcessing(true);
    const result = await payDebt(selectedCustomer.id, amount);

    if (result.success) {
      showToast('Pagamento registrado com sucesso!', 'success');
      setIsPaymentModalOpen(false);
      setSelectedCustomer(null);
      setAmount(0);
      router.refresh();
    } else {
      showToast(`Erro: ${result.error}`, 'error');
    }
    setIsProcessing(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsProcessing(true);
    const result = await deleteCustomer(deleteTarget.id);
    if (result.success) {
      showToast('Cliente eliminado com sucesso!', 'success');
      setDeleteTarget(null);
      router.refresh();
    } else {
      showToast(`Erro: ${result.error}`, 'error');
    }
    setIsProcessing(false);
  };

  const handleCreateCustomer = async () => {
    if (!newCustomer.nome) return;
    
    setIsProcessing(true);
    const result = await createCustomer(newCustomer.nome, newCustomer.telefone, newCustomer.limite, newCustomer.prazo || null);

    if (result.success) {
      showToast('Cliente criado com sucesso!', 'success');
      setIsCreateModalOpen(false);
      setNewCustomer({ nome: '', telefone: '', limite: 5000, prazo: '' });
      router.refresh();
    } else {
      showToast(`Erro: ${result.error}`, 'error');
    }
    setIsProcessing(false);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1>Clientes com Dívida</h1>
          <p>Gerencie débitos e prazos de pagamento.</p>
        </div>
        <button className="btn-primary" onClick={() => setIsCreateModalOpen(true)}>
          <UserPlus size={20} /> Novo Cliente
        </button>
      </header>

      {overdueCustomers.length > 0 && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)', fontWeight: 600 }}>
            <Bell size={18} /> {overdueCustomers.length} cliente(s) com prazo de pagamento vencido
          </div>
          {overdueCustomers.map(c => (
            <div key={c.id} style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', paddingLeft: '1.75rem' }}>
              · <strong style={{ color: 'var(--text)' }}>{c.nome}</strong> — prazo: {c.prazo_pagamento} — dívida: {c.divida_total.toLocaleString('pt-AO')} Kz
            </div>
          ))}
        </div>
      )}

      <div className={styles.controls}>
        <div className={styles.searchBar}>
          <Search size={20} color="var(--text-secondary)" />
          <input 
            type="text" 
            placeholder="Pesquisar cliente..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.customerGrid}>
        {filteredCustomers.map(customer => (
          <div key={customer.id} className={`glass-card ${styles.customerCard}`}>
            <div className={styles.customerHeader}>
              <div className={styles.avatar}>
                {customer.nome.charAt(0).toUpperCase()}
              </div>
              <div className={styles.customerInfo}>
                <h3>{customer.nome}</h3>
                <p><Phone size={14} /> {customer.telefone || 'Sem telefone'}</p>
              </div>
            </div>
            
            <div className={styles.debtInfo}>
              <div className={styles.debtRow}>
                <span>Dívida Atual</span>
                <span className={customer.divida_total > 0 ? styles.hasDebt : ''} style={{ color: customer.divida_total === 0 ? 'var(--success)' : undefined }}>
                  {customer.divida_total > 0 ? customer.divida_total.toLocaleString('pt-AO') + ' Kz' : 'Sem dívida'}
                </span>
              </div>
              <div className={styles.debtRow}>
                <span>Limite</span>
                <span>{customer.limite_credito.toLocaleString('pt-AO') + ' Kz'}</span>
              </div>
              {customer.prazo_pagamento && (
                <div className={styles.debtRow}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Calendar size={13} /> Prazo</span>
                  <span style={{ color: customer.prazo_pagamento <= today ? 'var(--danger)' : 'var(--text)', fontWeight: customer.prazo_pagamento <= today ? 600 : 400 }}>
                    {customer.prazo_pagamento}{customer.prazo_pagamento <= today ? ' ⚠ Vencido' : ''}
                  </span>
                </div>
              )}
              <div className={styles.progressBar}>
                <div 
                  className={styles.progressFill} 
                  style={{ width: `${Math.min((customer.divida_total / customer.limite_credito) * 100, 100)}%` }}
                />
              </div>
            </div>

            <button 
              className="btn-secondary" 
              style={{ width: '100%', marginTop: '1rem', justifyContent: 'center', gap: '0.5rem' }}
              onClick={() => {
                setSelectedCustomer(customer);
                setIsPaymentModalOpen(true);
              }}
              disabled={customer.divida_total <= 0}
            >
              <DollarSign size={18} /> Registrar Pagamento
            </button>
            {userTipo === 'funcionario' && (
              <button
                className="btn-secondary"
                style={{ width: '100%', marginTop: '0.5rem', justifyContent: 'center', gap: '0.5rem', color: 'var(--danger)', borderColor: 'var(--danger)' }}
                onClick={() => setDeleteTarget(customer)}
              >
                <Trash2 size={18} /> Eliminar Cliente
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Payment Modal */}
      {isPaymentModalOpen && selectedCustomer && (
        <div className={styles.modalOverlay}>
          <div className={`glass-card ${styles.modal}`}>
            <h2>Registrar Pagamento</h2>
            <p className={styles.modalSub}>{selectedCustomer.nome}</p>
            
            <div className={styles.debtSummary}>
              <span>Dívida Pendente:</span>
              <strong>{selectedCustomer.divida_total.toLocaleString('pt-AO') + ' Kz'}</strong>
            </div>

            <div className={styles.formGroup}>
              <label>Valor Pago</label>
              <input 
                type="number" 
                value={amount} 
                onChange={(e) => setAmount(Number(e.target.value))}
                max={selectedCustomer.divida_total}
              />
            </div>

            <div className={styles.modalActions}>
              <button className="btn-secondary" onClick={() => setIsPaymentModalOpen(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handlePayment} disabled={isProcessing}>
                {isProcessing ? 'Processando...' : 'Confirmar Pagamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Customer Modal */}
      {isCreateModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={`glass-card ${styles.modal}`}>
            <h2>Novo Cliente</h2>
            
            <div className={styles.formGroup}>
              <label>Nome *</label>
              <input 
                type="text" 
                value={newCustomer.nome} 
                onChange={(e) => setNewCustomer({...newCustomer, nome: e.target.value})}
                placeholder="Nome completo do cliente"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Telefone</label>
              <input 
                type="text" 
                value={newCustomer.telefone} 
                onChange={(e) => setNewCustomer({...newCustomer, telefone: e.target.value})}
                placeholder="Ex: 923 000 000"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Limite de Crédito (Kz)</label>
              <input 
                type="number" 
                value={newCustomer.limite} 
                onChange={(e) => setNewCustomer({...newCustomer, limite: Number(e.target.value)})}
                placeholder="Valor máximo que pode dever"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Prazo de Pagamento</label>
              <input 
                type="date" 
                value={newCustomer.prazo} 
                onChange={(e) => setNewCustomer({...newCustomer, prazo: e.target.value})}
              />
              <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                Data limite para liquidar a dívida. O sistema vai alertar quando chegar o prazo.
              </small>
            </div>

            <div className={styles.modalActions}>
              <button className="btn-secondary" onClick={() => setIsCreateModalOpen(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleCreateCustomer} disabled={isProcessing}>
                {isProcessing ? 'Criando...' : 'Criar Cliente'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className={styles.modalOverlay}>
          <div className={`glass-card ${styles.modal}`}>
            <h2>Eliminar Cliente</h2>
            <p className={styles.modalSub}>Tem a certeza que quer eliminar <strong>{deleteTarget.nome}</strong>? Esta ação não pode ser desfeita.</p>
            <div className={styles.modalActions}>
              <button className="btn-secondary" onClick={() => setDeleteTarget(null)}>Cancelar</button>
              <button
                className="btn-primary"
                style={{ background: 'var(--danger)', color: '#fff' }}
                onClick={handleDelete}
                disabled={isProcessing}
              >
                {isProcessing ? 'Eliminando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
