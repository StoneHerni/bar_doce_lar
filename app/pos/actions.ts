'use server';

import { all, get, run, exec, transaction, initDb } from '@/lib/db';
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

  try {
    const saleId = await transaction(async () => {
      // 0. Check stock availability
      for (const item of cart) {
        const product = await get('SELECT estoque_atual, nome FROM produtos WHERE id = ?', [item.id]) as { estoque_atual: number; nome: string };
        if (item.quantity > product.estoque_atual) {
          throw new Error(`Stock insuficiente: ${product.nome} (disponível: ${product.estoque_atual})`);
        }
      }

      // 1. Check Credit Limit if there's debt and a customer
      if (divida > 0 && customerId) {
        const customer = await get('SELECT limite_credito FROM clientes WHERE id = ?', [customerId]) as { limite_credito: number };
        const currentDebt = await get('SELECT SUM(divida) as total FROM vendas WHERE cliente_id = ? AND divida > 0', [customerId]) as { total: number };
        
        const totalDebt = (currentDebt.total || 0) + divida;
        if (totalDebt > customer.limite_credito) {
          throw new Error(`Limite de crédito excedido! Limite: ${customer.limite_credito} Kz, Dívida total seria: ${totalDebt} Kz`);
        }
      }

      // 2. Insert Sale Header
      const saleResult = await run(`
        INSERT INTO vendas (data, cliente_id, tipo_pagamento, total, pago, divida, funcionario_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [today, customerId, paymentType, total, pago, divida, funcionarioId]);

      const saleId = saleResult.lastInsertRowid;

      // 3. Process Items and Stock
      for (const item of cart) {
        await run(`
          INSERT INTO venda_itens (venda_id, produto_id, quantidade, preco_unitario)
          VALUES (?, ?, ?, ?)
        `, [saleId, item.id, item.quantity, item.preco_venda]);
        
        await run(`
          UPDATE produtos SET estoque_atual = estoque_atual - ? WHERE id = ?
        `, [item.quantity, item.id]);
        
        await run('INSERT INTO movimentos_estoque (produto_id, tipo, quantidade, descricao, referencia_id) VALUES (?, ?, ?, ?, ?)',
          [item.id, 'saida', item.quantity, `Venda #${saleId}`, saleId]);
      }

      // 4. Update Caixa if Cash
      if (paymentType === 'dinheiro') {
        await run(`
          INSERT INTO caixa (data, descricao, tipo, valor)
          VALUES (?, ?, ?, ?)
        `, [today, `Venda #${saleId}`, 'entrada', pago]);
      }

      return saleId;
    });
    revalidatePath('/');
    revalidatePath('/pos');
    revalidatePath('/estoque');
    return { success: true, saleId };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteSale(saleId: number) {
  try {
    await transaction(async () => {
      const items = await all('SELECT produto_id, quantidade FROM venda_itens WHERE venda_id = ?', [saleId]) as { produto_id: number; quantidade: number }[];
      
      for (const item of items) {
        await run('UPDATE produtos SET estoque_atual = estoque_atual + ? WHERE id = ?', [item.quantidade, item.produto_id]);
      }
      
      await run('DELETE FROM movimentos_estoque WHERE referencia_id = ? AND tipo = ?', [saleId, 'saida']);
      await run('DELETE FROM venda_itens WHERE venda_id = ?', [saleId]);
      await run('DELETE FROM vendas WHERE id = ?', [saleId]);
    });
    revalidatePath('/');
    revalidatePath('/pos');
    revalidatePath('/estoque');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
