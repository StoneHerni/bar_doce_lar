'use server';

import db from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function createCustomer(nome: string, telefone: string, limite: number, prazo: string | null) {
  try {
    db.prepare('INSERT INTO clientes (nome, telefone, limite_credito, prazo_pagamento) VALUES (?, ?, ?, ?)')
      .run(nome, telefone, limite, prazo);
    
    revalidatePath('/clientes');
    revalidatePath('/pos');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteCustomer(id: number) {
  try {
    db.transaction(() => {
      // apagar itens das vendas do cliente
      const vendas = db.prepare('SELECT id FROM vendas WHERE cliente_id = ?').all(id) as { id: number }[];
      for (const v of vendas) {
        db.prepare('DELETE FROM venda_itens WHERE venda_id = ?').run(v.id);
      }
      // apagar vendas do cliente
      db.prepare('DELETE FROM vendas WHERE cliente_id = ?').run(id);
      // apagar cliente
      db.prepare('DELETE FROM clientes WHERE id = ?').run(id);
    })();
    revalidatePath('/clientes');
    revalidatePath('/pos');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function payDebt(customerId: number, amount: number) {
  const today = new Date().toISOString().split('T')[0];

  const transaction = db.transaction(() => {
    // 1. Get total debt to ensure we don't pay more than owed
    const debts = db.prepare('SELECT id, divida FROM vendas WHERE cliente_id = ? AND divida > 0 ORDER BY data ASC').all(customerId) as any[];
    
    let remainingAmount = amount;

    for (const sale of debts) {
      if (remainingAmount <= 0) break;

      const payForThisSale = Math.min(sale.divida, remainingAmount);
      const newDivida = sale.divida - payForThisSale;

      db.prepare('UPDATE vendas SET divida = ?, pago = pago + ? WHERE id = ?')
        .run(newDivida, payForThisSale, sale.id);

      remainingAmount -= payForThisSale;
    }

    // 2. Record entry in Caixa
    db.prepare('INSERT INTO caixa (data, descricao, tipo, valor) VALUES (?, ?, ?, ?)')
      .run(today, `Pagamento de dívida - Cliente #${customerId}`, 'entrada', amount);
  });

  try {
    transaction();
    revalidatePath('/clientes');
    revalidatePath('/');
    revalidatePath('/pos');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
