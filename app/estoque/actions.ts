'use server';

import { all, get, run, exec, transaction, initDb } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function createProduct(nome: string, preco: number, estoque: number, estoqueMinimo: number, gradeId?: number) {
  try {
    const existing = await get('SELECT id FROM produtos WHERE nome = ?', [nome]);
    if (existing) {
      return { success: false, error: 'Produto já existe' };
    }
    
    let garrafasPorGrade = 1;
    if (gradeId) {
      const grade = await get('SELECT garrafas_por_grade FROM grades WHERE id = ?', [gradeId]) as { garrafas_por_grade: number } | undefined;
      if (grade) garrafasPorGrade = grade.garrafas_por_grade;
    }
    
    await run('INSERT INTO produtos (nome, preco, estoque_atual, estoque_minimo, grade_id, garrafas_por_grade) VALUES (?, ?, ?, ?, ?, ?)',
      [nome, preco, estoque, estoqueMinimo, gradeId || null, garrafasPorGrade]);
    
    revalidatePath('/estoque');
    revalidatePath('/pos');
    revalidatePath('/grades');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateProduct(id: number, nome: string, preco: number, estoqueMinimo: number, gradeId?: number | null) {
  try {
    const existing = await get('SELECT id FROM produtos WHERE nome = ? AND id != ?', [nome, id]);
    if (existing) {
      return { success: false, error: 'Já existe um produto com esse nome' };
    }
    
    let garrafasPorGrade = 1;
    if (gradeId) {
      const grade = await get('SELECT garrafas_por_grade FROM grades WHERE id = ?', [gradeId]) as { garrafas_por_grade: number } | undefined;
      if (grade) garrafasPorGrade = grade.garrafas_por_grade;
    }
    
    await run('UPDATE produtos SET nome = ?, preco = ?, estoque_minimo = ?, grade_id = ?, garrafas_por_grade = ? WHERE id = ?',
      [nome, preco, estoqueMinimo, gradeId || null, garrafasPorGrade, id]);
    
    revalidatePath('/estoque');
    revalidatePath('/pos');
    revalidatePath('/grades');
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteProduct(id: number) {
  try {
    // Verificar se o produto tem histórico em compras, vendas ou perdas
    const hasCompras = await get('SELECT id FROM compra_itens WHERE produto_id = ? LIMIT 1', [id]);
    const hasVendas = await get('SELECT id FROM venda_itens WHERE produto_id = ? LIMIT 1', [id]);
    const hasPerdas = await get('SELECT id FROM perdas WHERE produto_id = ? LIMIT 1', [id]);
    
    await transaction(async () => {
      // Sempre remover do POS para não poder vender
      await run('DELETE FROM pos_produtos WHERE produto_id = ?', [id]);
      await run('DELETE FROM fecho_turno_itens WHERE produto_id = ?', [id]);
      await run('DELETE FROM produto_precos WHERE produto_id = ?', [id]);

      if (hasCompras || hasVendas || hasPerdas) {
        // Se tem histórico, fazemos soft-delete para não corromper relatórios passados
        await run('UPDATE produtos SET ativo = 0 WHERE id = ?', [id]);
      } else {
        // Se não tem histórico nenhum, podemos apagar permanentemente
        await run('DELETE FROM movimentos_estoque WHERE produto_id = ?', [id]);
        await run('DELETE FROM produtos WHERE id = ?', [id]);
      }
    });
    
    revalidatePath('/estoque');
    revalidatePath('/pos');
    revalidatePath('/grades');
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function addStock(productId: number, quantity: number) {
  try {
    await transaction(async () => {
      await run('UPDATE produtos SET estoque_atual = estoque_atual + ? WHERE id = ?', [quantity, productId]);
      
      await run('INSERT INTO movimentos_estoque (produto_id, tipo, quantidade, descricao) VALUES (?, ?, ?, ?)',
        [productId, 'entrada', quantity, 'Entrada de stock']);
    });
    
    revalidatePath('/estoque');
    revalidatePath('/pos');
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function registerLoss(productId: number, quantity: number, reason: string) {
  const today = new Date().toISOString().split('T')[0];

  try {
    await transaction(async () => {
      const product = await get('SELECT estoque_atual FROM produtos WHERE id = ?', [productId]) as { estoque_atual: number };
      
      if (quantity > product.estoque_atual) {
        throw new Error(`Quantidade superior ao estoque disponível (${product.estoque_atual} un)`);
      }

      await run('INSERT INTO perdas (data, produto_id, quantidade, motivo) VALUES (?, ?, ?, ?)',
        [today, productId, quantity, reason]);

      await run('UPDATE produtos SET estoque_atual = estoque_atual - ? WHERE id = ?', [quantity, productId]);

      await run('INSERT INTO movimentos_estoque (produto_id, tipo, quantidade, descricao) VALUES (?, ?, ?, ?)',
        [productId, 'perda', quantity, reason]);
    });
    revalidatePath('/estoque');
    revalidatePath('/pos');
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getPrecosProduto(produtoId: number) {
  return await all('SELECT * FROM produto_precos WHERE produto_id = ? ORDER BY quantidade_minima ASC', [produtoId]) as { id: number; quantidade_minima: number; preco: number }[];
}

export async function savePrecosProduto(produtoId: number, precos: { quantidade_minima: number; preco: number }[]) {
  try {
    await transaction(async () => {
      await run('DELETE FROM produto_precos WHERE produto_id = ?', [produtoId]);
      for (const p of precos) {
        await run('INSERT INTO produto_precos (produto_id, quantidade_minima, preco) VALUES (?, ?, ?)', [produtoId, p.quantidade_minima, p.preco]);
      }
    });
    revalidatePath('/estoque');
    revalidatePath('/pos');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
