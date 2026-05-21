import { all, get, run, exec, transaction, initDb } from '@/lib/db';
import POSClient from './POSClient';

export default async function POSPage() {
  await initDb();
  
  const products = await all(`
    SELECT p.id, p.nome, p.estoque_atual, p.estoque_minimo, p.grade_id, p.garrafas_por_grade, pp.preco_venda
    FROM pos_produtos pp
    JOIN produtos p ON p.id = pp.produto_id
    WHERE pp.ativo = 1
    ORDER BY p.nome
  `) as any[];
  
  const customers = await all('SELECT * FROM clientes ORDER BY nome') as any[];
  const promotions = await all('SELECT * FROM produto_precos ORDER BY produto_id, quantidade_minima ASC') as any[];
  
  return <POSClient products={products} customers={customers} promotions={promotions} />;
}