'use client';

import { useState } from 'react';
import { Package, Plus, Edit3, Trash2, X } from 'lucide-react';
import { createGrade, updateGrade, deleteGrade } from './actions';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';

interface Grade {
  id: number;
  nome: string;
  garrafas_por_grade: number;
}

interface Product {
  id: number;
  nome: string;
  preco: number;
  estoque_atual: number;
  estoque_minimo: number;
  grade_id: number | null;
  grade_nome: string | null;
  garrafas_por_grade: number;
}

interface Fornecedor {
  id: number;
  nome: string;
  telefone: string;
}

const fmt = (n: number) => Math.round(n).toLocaleString('pt-AO');

export default function GradesClient({ grades, products, userRole, fornecedores }: { grades: Grade[], products: Product[], userRole: string, fornecedores: Fornecedor[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const isAdmin = userRole === 'admin';

  const [modalType, setModalType] = useState<'grade' | null>(null);
  const [editingGrade, setEditingGrade] = useState<Grade | null>(null);
  const [gradeForm, setGradeForm] = useState({ nome: '', garrafas: '24' });
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSaveGrade = async () => {
    if (!gradeForm.nome || !gradeForm.garrafas) return;
    setIsProcessing(true);

    let result;
    if (editingGrade) {
      result = await updateGrade(editingGrade.id, gradeForm.nome, parseInt(gradeForm.garrafas));
    } else {
      result = await createGrade(gradeForm.nome, parseInt(gradeForm.garrafas));
    }

    if (result.success) {
      showToast(editingGrade ? 'Grade atualizada!' : 'Grade criada!', 'success');
      closeModal();
      router.refresh();
    } else {
      showToast(result.error || 'Erro', 'error');
    }
    setIsProcessing(false);
  };

  const handleDeleteGrade = async (grade: Grade) => {
    if (!confirm(`Eliminar grade "${grade.nome}"?`)) return;
    
    const result = await deleteGrade(grade.id);
    if (result.success) {
      showToast('Grade eliminada!', 'success');
      router.refresh();
    } else {
      showToast(result.error || 'Erro', 'error');
    }
  };

  const openEditGrade = (grade: Grade) => {
    setEditingGrade(grade);
    setGradeForm({ nome: grade.nome, garrafas: grade.garrafas_por_grade.toString() });
    setModalType('grade');
  };

  const closeModal = () => {
    setModalType(null);
    setEditingGrade(null);
    setGradeForm({ nome: '', garrafas: '24' });
  };

  return (
    <div style={{ padding: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 600 }}>Grades / Embalagens</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Gerir grades e configurações de embalagens de bebidas
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {isAdmin && (
            <button className="btn-primary" onClick={() => setModalType('grade')}>
              <Plus size={18} /> Nova Grade
            </button>
          )}
        </div>
      </header>

      <div className="glass-card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Grades Cadastradas</h3>
        {grades.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', padding: '2rem', textAlign: 'center' }}>
            Nenhuma grade cadastrada
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '0.75rem' }}>Nome</th>
                <th style={{ textAlign: 'center', padding: '0.75rem' }}>Garrafas por Grade</th>
                {isAdmin && <th style={{ textAlign: 'right', padding: '0.75rem' }}>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {grades.map(grade => (
                <tr key={grade.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.75rem' }}><Package size={18} style={{ marginRight: '0.5rem' }} />{grade.nome}</td>
                  <td style={{ textAlign: 'center', padding: '0.75rem' }}>{grade.garrafas_por_grade} un</td>
                  {isAdmin && (
                    <td style={{ textAlign: 'right', padding: '0.75rem' }}>
                      <button className="icon-btn" onClick={() => openEditGrade(grade)} title="Editar"><Edit3 size={18} /></button>
                      <button className="icon-btn" onClick={() => handleDeleteGrade(grade)} title="Eliminar" style={{ color: 'var(--error)' }}><Trash2 size={18} /></button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="glass-card">
        <h3 style={{ marginBottom: '1rem' }}>Produtos e Estoque</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: '0.75rem' }}>Produto</th>
              <th style={{ textAlign: 'center', padding: '0.75rem' }}>Grade</th>
              <th style={{ textAlign: 'center', padding: '0.75rem' }}>Garrafas/Grade</th>
              <th style={{ textAlign: 'center', padding: '0.75rem' }}>Estoque (un)</th>
              <th style={{ textAlign: 'right', padding: '0.75rem' }}>Preço</th>
            </tr>
          </thead>
          <tbody>
            {products.map(prod => (
              <tr key={prod.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '0.75rem' }}>{prod.nome}</td>
                <td style={{ textAlign: 'center', padding: '0.75rem' }}>{prod.grade_nome || '-'}</td>
                <td style={{ textAlign: 'center', padding: '0.75rem' }}>{prod.garrafas_por_grade}</td>
                <td style={{ textAlign: 'center', padding: '0.75rem' }}>{prod.estoque_atual} un</td>
                <td style={{ textAlign: 'right', padding: '0.75rem' }}>{fmt(prod.preco)} Kz</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalType === 'grade' && (
        <div className="modal-overlay">
          <div className="glass-card" style={{ minWidth: '400px', padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2>{editingGrade ? 'Editar Grade' : 'Nova Grade'}</h2>
              <button className="icon-btn" onClick={closeModal}><X size={20} /></button>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Nome da Grade</label>
              <input
                type="text"
                value={gradeForm.nome}
                onChange={(e) => setGradeForm({ ...gradeForm, nome: e.target.value })}
                placeholder="Ex: Grade 24"
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Garrafas por Grade</label>
              <input
                type="number"
                value={gradeForm.garrafas}
                onChange={(e) => setGradeForm({ ...gradeForm, garrafas: e.target.value })}
                placeholder="24"
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={closeModal}>Cancelar</button>
              <button className="btn-primary" onClick={handleSaveGrade} disabled={isProcessing}>
                {isProcessing ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}



      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .icon-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 6px;
          color: var(--text-secondary);
          transition: all 0.2s;
        }
        .icon-btn:hover {
          background: var(--bg-secondary);
          color: var(--text);
        }
      `}</style>
    </div>
  );
}