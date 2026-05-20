'use server';

import db from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

export async function processSale(data: {
  cart: any[],
  paymentType: string,
  customerId: number | null,
  total: number,
  amountPaid: number,
}) {
  const { cart, paymentType, customerId, total, amountPaid } = data;
  const today = new Date().toISOString().split('T')[0];
  
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('user');
  let funcionarioId: number | null = null;
  
  if (userCookie) {
    try {
      const user = JSON.parse(userCookie.value);
      funcionarioId = user.id || null;
    } catch {}
  }
  
  const pago = paymentType === 'fiado' ? 0 : Math.min(amountPaid, total);
  const divida = total - pago;

  const transaction = db.transaction(() => {
    // 0. Check stock availability
    for (const item of cart) {
      const product = db.prepare('SELECT estoque_atual, nome FROM produtos WHERE id = ?').get(item.id) as { estoque_atual: number; nome: string };
      if (item.quantity > product.estoque_atual) {
        throw new Error(`Stock insuficiente: ${product.nome} (disponível: ${product.estoque_atual})`);
      }
    }

    // 1. Check Credit Limit if there's debt and a customer
    if (divida > 0 && customerId) {
      const customer = db.prepare('SELECT limite_credito FROM clientes WHERE id = ?').get(customerId) as { limite_credito: number };
      const currentDebt = db.prepare('SELECT SUM(divida) as total FROM vendas WHERE cliente_id = ? AND divida > 0').get(customerId) as { total: number };
      
      const totalDebt = (currentDebt.total || 0) + divida;
      if (totalDebt > customer.limite_credito) {
        throw new Error(`Limite de crédito excedido! Limite: ${customer.limite_credito} Kz, Dívida total seria: ${totalDebt} Kz`);
      }
    }

    // 2. Insert Sale Header
    const saleResult = db.prepare(`
      INSERT INTO vendas (data, cliente_id, tipo_pagamento, total, pago, divida, funcionario_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(today, customerId, paymentType, total, pago, divida, funcionarioId);

    const saleId = saleResult.lastInsertRowid;

    // 3. Process Items and Stock
    const insertItem = db.prepare(`
      INSERT INTO venda_itens (venda_id, produto_id, quantidade, preco_unitario)
      VALUES (?, ?, ?, ?)
    `);

    const updateStock = db.prepare(`
      UPDATE produtos SET estoque_atual = estoque_atual - ? WHERE id = ?
    `);

    for (const item of cart) {
      insertItem.run(saleId, item.id, item.quantity, item.preco_venda);
      updateStock.run(item.quantity, item.id);
      
      db.prepare('INSERT INTO movimentos_estoque (produto_id, tipo, quantidade, descricao, referencia_id) VALUES (?, ?, ?, ?, ?)')
        .run(item.id, 'saida', item.quantity, `Venda #${saleId}`, saleId);
    }

    // 4. Update Caixa if Cash
    if (paymentType === 'dinheiro') {
      db.prepare(`
        INSERT INTO caixa (data, descricao, tipo, valor)
        VALUES (?, ?, ?, ?)
      `).run(today, `Venda #${saleId}`, 'entrada', pago);
    }

    return saleId;
  });

  try {
    const saleId = transaction();
    revalidatePath('/');
    revalidatePath('/pos');
    revalidatePath('/estoque');
    return { success: true, saleId };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteSale(saleId: number) {
  const transaction = db.transaction(() => {
    const items = db.prepare('SELECT produto_id, quantidade FROM venda_itens WHERE venda_id = ?').all(saleId) as { produto_id: number; quantidade: number }[];
    
    for (const item of items) {
      db.prepare('UPDATE produtos SET estoque_atual = estoque_atual + ? WHERE id = ?').run(item.quantidade, item.produto_id);
    }
    
    db.prepare('DELETE FROM movimentos_estoque WHERE referencia_id = ? AND tipo = ?').run(saleId, 'saida');
    db.prepare('DELETE FROM venda_itens WHERE venda_id = ?').run(saleId);
    db.prepare('DELETE FROM vendas WHERE id = ?').run(saleId);
  });

  try {
    transaction();
    revalidatePath('/');
    revalidatePath('/pos');
    revalidatePath('/estoque');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
