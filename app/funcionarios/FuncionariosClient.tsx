'use client';

import { useState } from 'react';
import { UserPlus, Users, Shield, User, ToggleLeft, ToggleRight, Key, X } from 'lucide-react';
import styles from './funcionarios.module.css';
import { createFuncionario, toggleFuncionario, updateSenha, deleteFuncionario } from './actions';
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
  const [passwordModal, setPasswordModal] = useState<{ open: boolean; userId: number | null; userName: string }>({ open: false, userId: null, userName: '' });
  const [novaSenha, setNovaSenha] = useState('');

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

  const openPasswordModal = (func: Funcionario) => {
    setPasswordModal({ open: true, userId: func.id, userName: func.nome });
    setNovaSenha('');
  };

  const handleChangePassword = async () => {
    if (!passwordModal.userId || !novaSenha) return;
    setIsProcessing(true);
    const result = await updateSenha(passwordModal.userId, novaSenha);
    if (result.success) {
      showToast('Senha alterada com sucesso!', 'success');
      setPasswordModal({ open: false, userId: null, userName: '' });
      setNovaSenha('');
    } else {
      showToast(result.error || 'Erro ao alterar', 'error');
    }
    setIsProcessing(false);
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
                    <button className={styles.actionBtn} title="Alterar Senha" onClick={() => openPasswordModal(func)}>
                      <Key size={16} />
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

      {passwordModal.open && (
        <div className={styles.modalOverlay}>
          <div className={`glass-card ${styles.modal}`}>
            <h2>Alterar Senha</h2>
            <p className={styles.modalSub}>{passwordModal.userName}</p>
            
            <div className={styles.formGroup}>
              <label>Nova Senha</label>
              <input
                type="password"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <div className={styles.modalActions}>
              <button className="btn-secondary" onClick={() => setPasswordModal({ open: false, userId: null, userName: '' })}>Cancelar</button>
              <button className="btn-primary" onClick={handleChangePassword} disabled={isProcessing}>
                {isProcessing ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
