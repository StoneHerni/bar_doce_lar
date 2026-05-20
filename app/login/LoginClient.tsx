'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Wine, LogIn, Trash2 } from 'lucide-react';
import styles from './login.module.css';
import { login, clearUserCookie } from './actions';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    clearUserCookie();
  }, []);

  const handleClearCookies = async () => {
    await clearUserCookie();
    router.refresh();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(email, senha);

    if (result.success) {
      router.push('/');
      router.refresh();
    } else {
      setError(result.error || 'Erro ao fazer login');
    }
    setIsLoading(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <Wine size={48} />
          <h1>BAR DOCE LAR</h1>
          <span>Management System</span>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}
          
          <div className={styles.formGroup}>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label>Senha</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={isLoading}>
            <LogIn size={18} />
            {isLoading ? 'Entrando...' : 'Entrar'}
          </button>

          <button type="button" className={styles.clearBtn} onClick={handleClearCookies}>
            <Trash2 size={16} />
            Limpar cookies e recarregar
          </button>
        </form>
      </div>
    </div>
  );
}
