'use client';

import { useState } from 'react';
import { Settings, Package, Users, Save, AlertTriangle } from 'lucide-react';
import styles from './Configuracoes.module.css';
import { salvarConfiguracoes, aplicarEstoqueMinimoPadrao, Configuracoes } from './actions';
import { useRouter } from 'next/navigation';

export default function ConfiguracoesClient({ 
  settings, 
}: { 
  settings: Configuracoes;
}) {
  const router = useRouter();
  const [config, setConfig] = useState<Configuracoes>(settings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const result = await salvarConfiguracoes(config);
    if (result.success) {
      setMessage('Configurações guardadas com sucesso!');
      setTimeout(() => setMessage(''), 3000);
    }
    setSaving(false);
  };

  const handleAplicarPadrao = async () => {
    const result = await aplicarEstoqueMinimoPadrao();
    if (result.success) {
      setMessage(result.message || 'Aplicado com sucesso!');
      setTimeout(() => setMessage(''), 3000);
      router.refresh();
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Settings size={32} />
        <div>
          <h1>Configurações</h1>
          <p>Defina os parâmetros do seu negócio</p>
        </div>
      </header>

      {message && (
        <div className={styles.message}>
          <AlertTriangle size={18} />
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <Package size={20} />
            <h2>Estoque</h2>
          </div>
          
          <div className={styles.field}>
            <label>Estoque Mínimo Padrão</label>
            <input
              type="number"
              min="1"
              value={config.estoque_minimo_padrao}
              onChange={(e) => setConfig({ ...config, estoque_minimo_padrao: parseInt(e.target.value) || 0 })}
            />
            <span className={styles.hint}>Alerta automático quando produto atingir esta quantidade</span>
          </div>

          <button
            type="button"
            className={styles.btnSecondary}
            onClick={handleAplicarPadrao}
          >
            Aplicar a Todos os Produtos
          </button>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <Users size={20} />
            <h2>Clientes (Fiado)</h2>
          </div>

          <div className={styles.field}>
            <label>Limite de Fiado Padrão (Kz)</label>
            <input
              type="number"
              min="0"
              step="100"
              value={config.limite_fiado_padrao}
              onChange={(e) => setConfig({ ...config, limite_fiado_padrao: parseFloat(e.target.value) || 0 })}
            />
            <span className={styles.hint}>Limite máximo de fiado por cliente</span>
          </div>
        </div>

        <button type="submit" className={styles.btnPrimary} disabled={saving}>
          <Save size={18} />
          {saving ? 'Guardando...' : 'Guardar Configurações'}
        </button>
      </form>
    </div>
  );
}