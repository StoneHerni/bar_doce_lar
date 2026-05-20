import db from '@/lib/db';
import { cookies } from 'next/headers';
import InventoryClient from './InventoryClient';

export default async function InventoryPage() {
  const products = db.prepare(`
    SELECT p.*, g.nome as grade_nome, g.garrafas_por_grade 
    FROM produtos p 
    LEFT JOIN grades g ON g.id = p.grade_id 
    WHERE p.ativo = 1
    ORDER BY p.nome
  `).all();
  
  const grades = db.prepare('SELECT * FROM grades ORDER BY nome').all();

  // Movimentos: entradas (compras) + saídas (vendas + perdas)
  const movimentos = [
    ...db.prepare(`
      SELECT ci.produto_id, p.nome as produto_nome, 'entrada' as tipo,
        (COALESCE(ci.quantidade_grade, 0) * COALESCE(p.garrafas_por_grade, 1) + COALESCE(ci.quantidade_garrafas, 0)) as quantidade,
        c.data, COALESCE(f.nome, 'Fornecedor') as descricao
      FROM compra_itens ci
      JOIN compras c ON c.id = ci.compra_id
      JOIN produtos p ON p.id = ci.produto_id
      LEFT JOIN fornecedores f ON f.id = c.fornecedor_id
      WHERE p.ativo = 1
    `).all() as any[],
    ...db.prepare(`
      SELECT vi.produto_id, p.nome as produto_nome, 'saida' as tipo,
        vi.quantidade, v.data, 'Venda #' || v.id as descricao
      FROM venda_itens vi
      JOIN vendas v ON v.id = vi.venda_id
      JOIN produtos p ON p.id = vi.produto_id
      WHERE p.ativo = 1
    `).all() as any[],
    ...db.prepare(`
      SELECT pe.produto_id, p.nome as produto_nome, 'perda' as tipo,
        pe.quantidade, pe.data, pe.motivo as descricao
      FROM perdas pe
      JOIN produtos p ON p.id = pe.produto_id
      WHERE p.ativo = 1
    `).all() as any[],
  ].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 50);

  const cookieStore = await cookies();
  const userCookie = cookieStore.get('user');
  let userRole: 'admin' | 'funcionario' = 'funcionario';
  
  if (userCookie) {
    try {
      const user = JSON.parse(userCookie.value);
      userRole = user.tipo;
    } catch {}
  }

  // Preços por quantidade de todos os produtos
  const precosQuantidade = db.prepare('SELECT * FROM produto_precos ORDER BY produto_id, quantidade_minima ASC').all() as any[];

  return (
    <InventoryClient
      initialProducts={products as any[]}
      userRole={userRole}
      initialGrades={grades as any[]}
      movimentos={movimentos}
      precosQuantidade={precosQuantidade}
    />
  );
}
