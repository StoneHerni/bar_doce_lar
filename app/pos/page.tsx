import db from '@/lib/db';
import POSClient from './POSClient';
import { initDb } from '@/lib/db';

export default async function POSPage() {
  initDb();
  
  const products = db.prepare(`
    SELECT p.id, p.nome, p.estoque_atual, p.estoque_minimo, p.grade_id, p.garrafas_por_grade, pp.preco_venda
    FROM pos_produtos pp
    JOIN produtos p ON p.id = pp.produto_id
    WHERE pp.ativo = 1
    ORDER BY p.nome
  `).all() as any[];
  
  const customers = db.prepare('SELECT * FROM clientes ORDER BY nome').all() as any[];
  const promotions = db.prepare('SELECT * FROM produto_precos ORDER BY produto_id, quantidade_minima ASC').all() as any[];
  
  return <POSClient products={products} customers={customers} promotions={promotions} />;
}