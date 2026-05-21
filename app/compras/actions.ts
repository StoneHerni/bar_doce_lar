'use server';

import { all, get, run, exec, transaction, initDb } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function createPurchase(data: {
  fornecedorId: number;
  items: { produtoId: number; quantidade: number; precoUnitario: number }[];
  total: number;
}) {
  const today = new Date().toISOString().split('T')[0];

  try {
    await transaction(async () => {
      const purchaseResult = await run('INSERT INTO compras (data, fornecedor_id, total) VALUES (?, ?, ?)',
        [today, data.fornecedorId, data.total]);
      
      const purchaseId = purchaseResult.lastInsertRowid;

      for (const item of data.items) {
        const p = await get('SELECT garrafas_por_grade FROM produtos WHERE id = ?', [item.produtoId]) as { garrafas_por_grade: number } | undefined;
        const factor = p ? p.garrafas_por_grade : 1;
        const totalGarrafas = item.quantidade * factor;

        await run(`
          INSERT INTO compra_itens (compra_id, produto_id, quantidade_grade, quantidade_garrafas, preco_grade)
          VALUES (?, ?, ?, ?, ?)
        `, [
          purchaseId, 
          item.produtoId, 
          item.quantidade, // quantidade_grade
          totalGarrafas, // quantidade_garrafas
          item.precoUnitario // preco_grade
        ]);
        await run('UPDATE produtos SET estoque_atual = estoque_atual + ? WHERE id = ?', [totalGarrafas, item.produtoId]);
        await run('INSERT INTO movimentos_estoque (produto_id, tipo, quantidade, descricao, referencia_id) VALUES (?, ?, ?, ?, ?)',
          [item.produtoId, 'entrada', totalGarrafas, `Compra #${purchaseId} (${item.quantidade} cx)`, purchaseId]);
      }
    });
    revalidatePath('/compras');
    revalidatePath('/estoque');
    revalidatePath('/pos');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getPurchases() {
  return await all(`
    SELECT c.*, f.nome as fornecedor_nome 
    FROM compras c 
    LEFT JOIN fornecedores f ON c.fornecedor_id = f.id 
    ORDER BY c.data DESC
  `) as any[];
}

export async function getPurchaseItems(purchaseId: number) {
  return await all(`
    SELECT ci.*, p.nome as produto_nome 
    FROM compra_itens ci 
    JOIN produtos p ON ci.produto_id = p.id 
    WHERE ci.compra_id = ?
  `, [purchaseId]) as any[];
}

export async function deletePurchase(id: number) {
  try {
    await transaction(async () => {
      const items = await all('SELECT produto_id, quantidade_garrafas FROM compra_itens WHERE compra_id = ?', [id]) as any[];
      
      for (const item of items) {
        await run('UPDATE produtos SET estoque_atual = estoque_atual - ? WHERE id = ?', [item.quantidade_garrafas, item.produto_id]);
      }
      
      await run('DELETE FROM compra_itens WHERE compra_id = ?', [id]);
      await run('DELETE FROM compras WHERE id = ?', [id]);
    });
    revalidatePath('/compras');
    revalidatePath('/estoque');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}