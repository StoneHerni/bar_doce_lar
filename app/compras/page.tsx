import ComprasClient from './ComprasClient';
import db from '@/lib/db';
import { initDb } from '@/lib/db';

export default async function ComprasPage() {
  initDb();
  const compras = db.prepare(`
    SELECT c.*, f.nome as fornecedor_nome 
    FROM compras c 
    LEFT JOIN fornecedores f ON c.fornecedor_id = f.id 
    ORDER BY c.data DESC
  `).all() as any[];
  
  const fornecedores = db.prepare('SELECT * FROM fornecedores ORDER BY nome ASC').all() as any[];
  const produtos = db.prepare('SELECT id, nome, preco, estoque_atual FROM produtos WHERE ativo = 1 ORDER BY nome ASC').all() as any[];
  
  return <ComprasClient initialCompras={compras} fornecedores={fornecedores} produtos={produtos} />;
}