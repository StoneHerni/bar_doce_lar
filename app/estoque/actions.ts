'use server';

import db from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function createProduct(nome: string, preco: number, estoque: number, estoqueMinimo: number, gradeId?: number) {
  try {
    const existing = db.prepare('SELECT id FROM produtos WHERE nome = ?').get(nome);
    if (existing) {
      return { success: false, error: 'Produto já existe' };
    }
    
    let garrafasPorGrade = 1;
    if (gradeId) {
      const grade = db.prepare('SELECT garrafas_por_grade FROM grades WHERE id = ?').get(gradeId) as { garrafas_por_grade: number } | undefined;
      if (grade) garrafasPorGrade = grade.garrafas_por_grade;
    }
    
    db.prepare('INSERT INTO produtos (nome, preco, estoque_atual, estoque_minimo, grade_id, garrafas_por_grade) VALUES (?, ?, ?, ?, ?, ?)')
      .run(nome, preco, estoque, estoqueMinimo, gradeId || null, garrafasPorGrade);
    
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
    const existing = db.prepare('SELECT id FROM produtos WHERE nome = ? AND id != ?').get(nome, id);
    if (existing) {
      return { success: false, error: 'Já existe um produto com esse nome' };
    }
    
    let garrafasPorGrade = 1;
    if (gradeId) {
      const grade = db.prepare('SELECT garrafas_por_grade FROM grades WHERE id = ?').get(gradeId) as { garrafas_por_grade: number } | undefined;
      if (grade) garrafasPorGrade = grade.garrafas_por_grade;
    }
    
    db.prepare('UPDATE produtos SET nome = ?, preco = ?, estoque_minimo = ?, grade_id = ?, garrafas_por_grade = ? WHERE id = ?')
      .run(nome, preco, estoqueMinimo, gradeId || null, garrafasPorGrade, id);
    
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
    const hasCompras = db.prepare('SELECT id FROM compra_itens WHERE produto_id = ? LIMIT 1').get(id);
    const hasVendas = db.prepare('SELECT id FROM venda_itens WHERE produto_id = ? LIMIT 1').get(id);
    const hasPerdas = db.prepare('SELECT id FROM perdas WHERE produto_id = ? LIMIT 1').get(id);
    
    db.transaction(() => {
      // Sempre remover do POS para não poder vender
      db.prepare('DELETE FROM pos_produtos WHERE produto_id = ?').run(id);
      db.prepare('DELETE FROM fecho_turno_itens WHERE produto_id = ?').run(id);
      db.prepare('DELETE FROM produto_precos WHERE produto_id = ?').run(id);

      if (hasCompras || hasVendas || hasPerdas) {
        // Se tem histórico, fazemos soft-delete para não corromper relatórios passados
        db.prepare('UPDATE produtos SET ativo = 0 WHERE id = ?').run(id);
      } else {
        // Se não tem histórico nenhum, podemos apagar permanentemente
        db.prepare('DELETE FROM movimentos_estoque WHERE produto_id = ?').run(id);
        db.prepare('DELETE FROM produtos WHERE id = ?').run(id);
      }
    })();
    
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
    db.transaction(() => {
      db.prepare('UPDATE produtos SET estoque_atual = estoque_atual + ? WHERE id = ?')
        .run(quantity, productId);
      
      db.prepare('INSERT INTO movimentos_estoque (produto_id, tipo, quantidade, descricao) VALUES (?, ?, ?, ?)')
        .run(productId, 'entrada', quantity, 'Entrada de stock');
    })();
    
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

  const transaction = db.transaction(() => {
    const product = db.prepare('SELECT estoque_atual FROM produtos WHERE id = ?').get(productId) as { estoque_atual: number };
    
    if (quantity > product.estoque_atual) {
      throw new Error(`Quantidade superior ao estoque disponível (${product.estoque_atual} un)`);
    }

    db.prepare('INSERT INTO perdas (data, produto_id, quantidade, motivo) VALUES (?, ?, ?, ?)')
      .run(today, productId, quantity, reason);

    db.prepare('UPDATE produtos SET estoque_atual = estoque_atual - ? WHERE id = ?')
      .run(quantity, productId);

    db.prepare('INSERT INTO movimentos_estoque (produto_id, tipo, quantidade, descricao) VALUES (?, ?, ?, ?)')
      .run(productId, 'perda', quantity, reason);
  });

  try {
    transaction();
    revalidatePath('/estoque');
    revalidatePath('/pos');
    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getPrecosProduto(produtoId: number) {
  return db.prepare('SELECT * FROM produto_precos WHERE produto_id = ? ORDER BY quantidade_minima ASC').all(produtoId) as { id: number; quantidade_minima: number; preco: number }[];
}

export async function savePrecosProduto(produtoId: number, precos: { quantidade_minima: number; preco: number }[]) {
  try {
    db.transaction(() => {
      db.prepare('DELETE FROM produto_precos WHERE produto_id = ?').run(produtoId);
      const insert = db.prepare('INSERT INTO produto_precos (produto_id, quantidade_minima, preco) VALUES (?, ?, ?)');
      for (const p of precos) {
        insert.run(produtoId, p.quantidade_minima, p.preco);
      }
    })();
    revalidatePath('/estoque');
    revalidatePath('/pos');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
