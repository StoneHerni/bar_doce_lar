'use server';

import { all, get, run, exec, transaction, initDb } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function createCustomer(nome: string, telefone: string, limite: number, prazo: string | null) {
  try {
    await run('INSERT INTO clientes (nome, telefone, limite_credito, prazo_pagamento) VALUES (?, ?, ?, ?)',
      [nome, telefone, limite, prazo]);
    
    revalidatePath('/clientes');
    revalidatePath('/pos');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteCustomer(id: number) {
  try {
    await transaction(async () => {
      // apagar itens das vendas do cliente
      const vendas = await all('SELECT id FROM vendas WHERE cliente_id = ?', [id]) as { id: number }[];
      for (const v of vendas) {
        await run('DELETE FROM venda_itens WHERE venda_id = ?', [v.id]);
      }
      // apagar vendas do cliente
      await run('DELETE FROM vendas WHERE cliente_id = ?', [id]);
      // apagar cliente
      await run('DELETE FROM clientes WHERE id = ?', [id]);
    });
    revalidatePath('/clientes');
    revalidatePath('/pos');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function payDebt(customerId: number, amount: number) {
  const today = new Date().toISOString().split('T')[0];

  try {
    await transaction(async () => {
      // 1. Get total debt to ensure we don't pay more than owed
      const debts = await all('SELECT id, divida FROM vendas WHERE cliente_id = ? AND divida > 0 ORDER BY data ASC', [customerId]) as any[];
      
      let remainingAmount = amount;

      for (const sale of debts) {
        if (remainingAmount <= 0) break;

        const payForThisSale = Math.min(sale.divida, remainingAmount);
        const newDivida = sale.divida - payForThisSale;

        await run('UPDATE vendas SET divida = ?, pago = pago + ? WHERE id = ?',
          [newDivida, payForThisSale, sale.id]);

        remainingAmount -= payForThisSale;
      }

      // 2. Record entry in Caixa
      await run('INSERT INTO caixa (data, descricao, tipo, valor) VALUES (?, ?, ?, ?)',
        [today, `Pagamento de dívida - Cliente #${customerId}`, 'entrada', amount]);
    });
    revalidatePath('/clientes');
    revalidatePath('/');
    revalidatePath('/pos');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
