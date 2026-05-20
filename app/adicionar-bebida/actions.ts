'use server';

import db from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function addPosProduct(produtoId: number, precoVenda: number) {
  try {
    const existing = db.prepare('SELECT id, ativo FROM pos_produtos WHERE produto_id = ?').get(produtoId) as { id: number; ativo: number } | undefined;

    // Verificar se o produto tem stock ou histórico de compra
    const product = db.prepare('SELECT estoque_atual FROM produtos WHERE id = ?').get(produtoId) as { estoque_atual: number } | undefined;
    const compra = db.prepare('SELECT id FROM compra_itens WHERE produto_id = ? LIMIT 1').get(produtoId);
    
    if ((!product || product.estoque_atual <= 0) && !compra) {
      return { success: false, error: 'Esta bebida não tem stock nem compras registadas! Insira stock no Estoque ou registe a compra.' };
    }

    if (existing) {
      if (existing.ativo === 1) {
        return { success: false, error: 'Bebida já está adicionada para venda' };
      } else {
        // Se já existe mas está desativada, reativamos e atualizamos o preço
        db.prepare('UPDATE pos_produtos SET ativo = 1, preco_venda = ? WHERE id = ?').run(precoVenda, existing.id);
        revalidatePath('/adicionar-bebida');
        revalidatePath('/pos');
        return { success: true };
      }
    }

    db.prepare('INSERT INTO pos_produtos (produto_id, preco_venda) VALUES (?, ?)').run(produtoId, precoVenda);
    revalidatePath('/adicionar-bebida');
    revalidatePath('/pos');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updatePosProduct(id: number, precoVenda: number) {
  try {
    db.prepare('UPDATE pos_produtos SET preco_venda = ? WHERE id = ?').run(precoVenda, id);
    revalidatePath('/adicionar-bebida');
    revalidatePath('/pos');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function removePosProduct(id: number) {
  try {
    db.prepare('UPDATE pos_produtos SET ativo = 0 WHERE id = ?').run(id);
    revalidatePath('/adicionar-bebida');
    revalidatePath('/pos');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
