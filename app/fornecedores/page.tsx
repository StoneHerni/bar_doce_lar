import FornecedoresClient from './FornecedoresClient';
import db from '@/lib/db';
import { initDb } from '@/lib/db';

export default async function FornecedoresPage() {
  initDb();
  const fornecedores = db.prepare('SELECT * FROM fornecedores ORDER BY nome ASC').all() as any[];
  
  return (
    <FornecedoresClient initialFornecedores={fornecedores} />
  );
}