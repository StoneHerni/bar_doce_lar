'use client';

import { useState, useEffect } from 'react';
import { ClipboardList, Save, ArrowLeft, AlertCircle, History } from 'lucide-react';
import Link from 'next/link';
import styles from './fecho.module.css';
import { createFechoTurno, getFechoTurnoByDate } from './actions';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';

interface Produto {
  id: number;
  nome: string;
  estoque_atual: number;
}

interface User {
  id: number;
  nome: string;
  tipo: 'admin' | 'funcionario';
}

interface FechoItem {
  produto_id: number;
  quantidade: number;
  quantidade_prateleira: number;
  quantidade_arca: number;
}

export default function FechoClient({ produtos, user }: { produtos: Produto[]; user: User }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [itens, setItens] = useState<FechoItem[]>(
    produtos.map(p => ({
      produto_id: p.id,
      quantidade: 0,
      quantidade_prateleira: 0,
      quantidade_arca: 0
    }))
  );
  const [observacao, setObservacao] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [alreadyDone, setAlreadyDone] = useState(false);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    getFechoTurnoByDate(today).then((fechos: any[]) => {
      if (fechos.length > 0) setAlreadyDone(true);
    });
  }, []);

  const updateQuantidade = (produtoId: number, field: 'quantidade_prateleira' | 'quantidade_arca', value: number) => {
    if (value < 0) return;
    setItens(prev =>
      prev.map(item => {
        if (item.produto_id === produtoId) {
          const updated = { ...item, [field]: value };
          updated.quantidade = updated.quantidade_prateleira + updated.quantidade_arca;
          return updated;
        }
        return item;
      })
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    const result = await createFechoTurno({
      funcionarioId: user.id,
      observacao,
      itens
    });

    if (result.success) {
      showToast('Fecho do turno guardado com sucesso!', 'success');
      router.push('/');
    } else {
      showToast(`Erro: ${result.error}`, 'error');
    }
    setIsSaving(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/" className={styles.backBtn}>
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1>Fecho do Turno</h1>
          <p>Registe as quantidades de cada produto ao terminar o turno</p>
        </div>
        <Link href="/fecho/historico" className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
          <History size={18} /> Histórico / PDF
        </Link>
      </div>

      {alreadyDone && (
        <div className={styles.warning}>
          <AlertCircle size={20} />
          <span>Já foi feito um fecho hoje. Pode criar outro se necessário.</span>
        </div>
      )}

      <div className="glass-card">
        <div className={styles.tableHeader}>
          <span>Produto</span>
          <span style={{ textAlign: 'center' }}>Prateleira</span>
          <span style={{ textAlign: 'center' }}>Arca</span>
          <span style={{ textAlign: 'center' }}>Restou (Total)</span>
        </div>

        <div className={styles.itemsList}>
          {produtos.map(produto => {
            const item = itens.find(i => i.produto_id === produto.id);
            return (
              <div key={produto.id} className={styles.itemRow}>
                <span className={styles.produtoNome}>{produto.nome}</span>
                
                {/* Qtd. Prateleira */}
                <div className={styles.quantidadeInput}>
                  <button onClick={() => updateQuantidade(produto.id, 'quantidade_prateleira', (item?.quantidade_prateleira || 0) - 1)}>-</button>
                  <input
                    type="number"
                    min="0"
                    value={item?.quantidade_prateleira || 0}
                    onChange={(e) => updateQuantidade(produto.id, 'quantidade_prateleira', parseInt(e.target.value) || 0)}
                  />
                  <button onClick={() => updateQuantidade(produto.id, 'quantidade_prateleira', (item?.quantidade_prateleira || 0) + 1)}>+</button>
                </div>

                {/* Qtd. Arca */}
                <div className={styles.quantidadeInput}>
                  <button onClick={() => updateQuantidade(produto.id, 'quantidade_arca', (item?.quantidade_arca || 0) - 1)}>-</button>
                  <input
                    type="number"
                    min="0"
                    value={item?.quantidade_arca || 0}
                    onChange={(e) => updateQuantidade(produto.id, 'quantidade_arca', parseInt(e.target.value) || 0)}
                  />
                  <button onClick={() => updateQuantidade(produto.id, 'quantidade_arca', (item?.quantidade_arca || 0) + 1)}>+</button>
                </div>

                {/* Total Leftover Badge */}
                <div style={{ textAlign: 'center' }}>
                  <span className={styles.totalBadge}>{item?.quantidade || 0}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className={styles.formGroup}>
          <label>Observação (opcional)</label>
          <textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Ex: Faltou luz às 18h, próxima entrega amanhã..."
            rows={3}
          />
        </div>

        <button
          className="btn-primary"
          style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}
          onClick={handleSave}
          disabled={isSaving}
        >
          <Save size={20} />
          {isSaving ? 'Guardando...' : 'Guardar Fecho do Turno'}
        </button>
      </div>
    </div>
  );
}
