'use server';

import db from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function createPurchase(data: {
  fornecedorId: number;
  items: { produtoId: number; quantidade: number; precoUnitario: number }[];
  total: number;
}) {
  const today = new Date().toISOString().split('T')[0];

  const transaction = db.transaction(() => {
    const purchaseResult = db.prepare('INSERT INTO compras (data, fornecedor_id, total) VALUES (?, ?, ?)')
      .run(today, data.fornecedorId, data.total);
    
    const purchaseId = purchaseResult.lastInsertRowid;

    const insertItem = db.prepare(`
      INSERT INTO compra_itens (compra_id, produto_id, quantidade_grade, quantidade_garrafas, preco_grade)
      VALUES (?, ?, ?, ?, ?)
    `);

    const updateStock = db.prepare('UPDATE produtos SET estoque_atual = estoque_atual + ? WHERE id = ?');
    const insertMovement = db.prepare('INSERT INTO movimentos_estoque (produto_id, tipo, quantidade, descricao, referencia_id) VALUES (?, ?, ?, ?, ?)');

    for (const item of data.items) {
      const p = db.prepare('SELECT garrafas_por_grade FROM produtos WHERE id = ?').get(item.produtoId) as { garrafas_por_grade: number } | undefined;
      const factor = p ? p.garrafas_por_grade : 1;
      const totalGarrafas = item.quantidade * factor;

      insertItem.run(
        purchaseId, 
        item.produtoId, 
        item.quantidade, // quantidade_grade
        totalGarrafas, // quantidade_garrafas
        item.precoUnitario // preco_grade
      );
      updateStock.run(totalGarrafas, item.produtoId);
      insertMovement.run(item.produtoId, 'entrada', totalGarrafas, `Compra #${purchaseId} (${item.quantidade} cx)`, purchaseId);
    }
  });

  try {
    transaction();
    revalidatePath('/compras');
    revalidatePath('/estoque');
    revalidatePath('/pos');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getPurchases() {
  return db.prepare(`
    SELECT c.*, f.nome as fornecedor_nome 
    FROM compras c 
    LEFT JOIN fornecedores f ON c.fornecedor_id = f.id 
    ORDER BY c.data DESC
  `).all() as any[];
}

export async function getPurchaseItems(purchaseId: number) {
  return db.prepare(`
    SELECT ci.*, p.nome as produto_nome 
    FROM compra_itens ci 
    JOIN produtos p ON ci.produto_id = p.id 
    WHERE ci.compra_id = ?
  `).all(purchaseId) as any[];
}

export async function deletePurchase(id: number) {
  const transaction = db.transaction(() => {
    const items = db.prepare('SELECT produto_id, quantidade_garrafas FROM compra_itens WHERE compra_id = ?').all(id) as any[];
    
    for (const item of items) {
      db.prepare('UPDATE produtos SET estoque_atual = estoque_atual - ? WHERE id = ?').run(item.quantidade_garrafas, item.produto_id);
    }
    
    db.prepare('DELETE FROM compra_itens WHERE compra_id = ?').run(id);
    db.prepare('DELETE FROM compras WHERE id = ?').run(id);
  });

  try {
    transaction();
    revalidatePath('/compras');
    revalidatePath('/estoque');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}