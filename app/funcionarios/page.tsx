import db from '@/lib/db';
import FuncionariosClient from './FuncionariosClient';

export default async function FuncionariosPage() {
  const funcionarios = db.prepare('SELECT id, nome, email, tipo, ativo, created_at FROM usuarios ORDER BY nome').all();

  return <FuncionariosClient initialFuncionarios={funcionarios as any[]} />;
}
