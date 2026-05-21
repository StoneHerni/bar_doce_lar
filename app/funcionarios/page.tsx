import { all, get, run, exec, transaction, initDb } from '@/lib/db';
import FuncionariosClient from './FuncionariosClient';

export default async function FuncionariosPage() {
  const funcionarios = await all('SELECT id, nome, email, tipo, ativo, created_at FROM usuarios ORDER BY nome');

  return <FuncionariosClient initialFuncionarios={funcionarios as any[]} />;
}
