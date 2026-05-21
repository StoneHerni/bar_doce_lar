import ComprasClient from './ComprasClient';
import { all, get, run, exec, transaction, initDb } from '@/lib/db';

export default async function ComprasPage() {
  await initDb();
  const compras = await all(`
    SELECT c.*, f.nome as fornecedor_nome 
    FROM compras c 
    LEFT JOIN fornecedores f ON c.fornecedor_id = f.id 
    ORDER BY c.data DESC
  `) as any[];
  
  const fornecedores = await all('SELECT * FROM fornecedores ORDER BY nome ASC') as any[];
  const produtos = await all('SELECT id, nome, preco, estoque_atual FROM produtos WHERE ativo = 1 ORDER BY nome ASC') as any[];
  
  return <ComprasClient initialCompras={compras} fornecedores={fornecedores} produtos={produtos} />;
}