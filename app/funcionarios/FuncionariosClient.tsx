'use client';

import { useState } from 'react';
import { UserPlus, Users, Shield, User, ToggleLeft, ToggleRight, X, Pencil } from 'lucide-react';
import styles from './funcionarios.module.css';
import { createFuncionario, toggleFuncionario, updateFuncionario, deleteFuncionario } from './actions';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';

interface Funcionario {
  id: number;
  nome: string;
  email: string;
  tipo: 'admin' | 'funcionario';
  ativo: number;
  created_at: string;
}

export default function FuncionariosClient({ initialFuncionarios }: { initialFuncionarios: Funcionario[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ nome: '', email: '', senha: '', tipo: 'funcionario' as 'admin' | 'funcionario' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [editModal, setEditModal] = useState<{ open: boolean; func: Funcionario | null }>({ open: false, func: null });
  const [editForm, setEditForm] = useState({ nome: '', email: '', tipo: 'funcionario' as 'admin' | 'funcionario', senha: '' });

  const handleCreate = async () => {
    if (!form.nome || !form.email || !form.senha) return;
    setIsProcessing(true);
    setError('');
    
    const result = await createFuncionario(form.nome, form.email, form.senha, form.tipo);
    
    if (result.success) {
      showToast('Funcionário criado com sucesso!', 'success');
      setIsModalOpen(false);
      setForm({ nome: '', email: '', senha: '', tipo: 'funcionario' });
      router.refresh();
    } else {
      showToast(result.error || 'Erro ao criar', 'error');
    }
    setIsProcessing(false);
  };

  const handleToggle = async (id: number, ativo: boolean) => {
    const result = await toggleFuncionario(id, ativo);
    if (result.success) {
      showToast(ativo ? 'Funcionário ativado!' : 'Funcionário desativado!', 'success');
    } else {
      showToast(result.error || 'Erro ao atualizar', 'error');
    }
    router.refresh();
  };

  const handleDelete = async (func: Funcionario) => {
    if (!confirm(`Tem certeza que deseja eliminar "${func.nome}"?`)) return;
    const result = await deleteFuncionario(func.id);
    if (result.success) {
      showToast('Funcionário eliminado!', 'success');
      router.refresh();
    } else {
      showToast(result.error || 'Erro ao eliminar', 'error');
    }
  };

  const openEditModal = (func: Funcionario) => {
    setEditForm({ nome: func.nome, email: func.email, tipo: func.tipo, senha: '' });
    setEditModal({ open: true, func });
  };

  const handleUpdate = async () => {
    if (!editModal.func || !editForm.nome || !editForm.email) return;
    setIsProcessing(true);
    setError('');

    const result = await updateFuncionario(
      editModal.func.id,
      editForm.nome,
      editForm.email,
      editForm.tipo,
      editForm.senha || undefined
    );

    if (result.success) {
      showToast('Funcionário atualizado com sucesso!', 'success');
      setEditModal({ open: false, func: null });
      setEditForm({ nome: '', email: '', tipo: 'funcionario', senha: '' });
      router.refresh();
    } else {
      showToast(result.error || 'Erro ao atualizar', 'error');
    }
    setIsProcessing(false);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1>Gestão de Funcionários</h1>
          <p>Gerencie contas e permissões dos funcionários.</p>
        </div>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          <UserPlus size={20} /> Novo Funcionário
        </button>
      </header>

      <div className="glass-card">
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Funcionário</th>
              <th>Email</th>
              <th>Tipo</th>
              <th>Estado</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {initialFuncionarios.map(func => (
              <tr key={func.id}>
                <td>
                  <div className={styles.userCell}>
                    <div className={styles.avatar}>
                      <Users size={18} />
                    </div>
                    <span>{func.nome}</span>
                  </div>
                </td>
                <td>{func.email}</td>
                <td>
                  <span className={`${styles.badge} ${func.tipo === 'admin' ? styles.admin : styles.func}`}>
                    {func.tipo === 'admin' ? <Shield size={14} /> : <User size={14} />}
                    {func.tipo === 'admin' ? 'Admin' : 'Funcionário'}
                  </span>
                </td>
                <td>
                  <button 
                    className={styles.toggleBtn}
                    onClick={() => handleToggle(func.id, !func.ativo)}
                  >
                    {func.ativo ? (
                      <><ToggleRight size={24} className={styles.on} /> Ativo</>
                    ) : (
                      <><ToggleLeft size={24} className={styles.off} /> Inativo</>
                    )}
                  </button>
                </td>
                <td>
                  <div className={styles.rowActions}>
                    <button className={styles.actionBtn} title="Editar" onClick={() => openEditModal(func)}>
                      <Pencil size={16} />
                    </button>
                    <button className={`${styles.actionBtn} ${styles.deleteBtn}`} title="Eliminar" onClick={() => handleDelete(func)}>
                      <X size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={`glass-card ${styles.modal}`}>
            <h2>Novo Funcionário</h2>
            
            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.formGroup}>
              <label>Nome</label>
              <input
                type="text"
                value={form.nome}
                onChange={(e) => setForm({...form, nome: e.target.value})}
                placeholder="Nome completo"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({...form, email: e.target.value})}
                placeholder="email@exemplo.com"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Senha</label>
              <input
                type="password"
                value={form.senha}
                onChange={(e) => setForm({...form, senha: e.target.value})}
                placeholder="••••••••"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Tipo de Conta</label>
              <select value={form.tipo} onChange={(e) => setForm({...form, tipo: e.target.value as 'admin' | 'funcionario'})}>
                <option value="funcionario">Funcionário</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            <div className={styles.modalActions}>
              <button className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleCreate} disabled={isProcessing}>
                {isProcessing ? 'Criando...' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editModal.open && editModal.func && (
        <div className={styles.modalOverlay}>
          <div className={`glass-card ${styles.modal}`}>
            <h2>Editar Funcionário</h2>
            
            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.formGroup}>
              <label>Nome</label>
              <input
                type="text"
                value={editForm.nome}
                onChange={(e) => setEditForm({...editForm, nome: e.target.value})}
                placeholder="Nome completo"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Email</label>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                placeholder="email@exemplo.com"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Tipo de Conta</label>
              <select value={editForm.tipo} onChange={(e) => setEditForm({...editForm, tipo: e.target.value as 'admin' | 'funcionario'})}>
                <option value="funcionario">Funcionário</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Nova Senha (deixe em branco para manter a atual)</label>
              <input
                type="password"
                value={editForm.senha}
                onChange={(e) => setEditForm({...editForm, senha: e.target.value})}
                placeholder="••••••••"
              />
            </div>

            <div className={styles.modalActions}>
              <button className="btn-secondary" onClick={() => setEditModal({ open: false, func: null })}>Cancelar</button>
              <button className="btn-primary" onClick={handleUpdate} disabled={isProcessing}>
                {isProcessing ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
