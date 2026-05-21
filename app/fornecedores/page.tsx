import FornecedoresClient from './FornecedoresClient';
import { all, get, run, exec, transaction, initDb } from '@/lib/db';

export default async function FornecedoresPage() {
  await initDb();
  const fornecedores = await all('SELECT * FROM fornecedores ORDER BY nome ASC') as any[];
  
  return (
    <FornecedoresClient initialFornecedores={fornecedores} />
  );
}