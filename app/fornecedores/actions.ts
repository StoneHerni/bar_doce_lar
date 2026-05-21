'use server';

import { all, get, run, exec, transaction, initDb } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function createFornecedor(nome: string, telefone: string) {
  try {
    const existing = await get('SELECT id FROM fornecedores WHERE nome = ?', [nome]);
    if (existing) {
      return { success: false, error: 'Fornecedor já existe' };
    }
    await run('INSERT INTO fornecedores (nome, telefone) VALUES (?, ?)', [nome, telefone]);
    revalidatePath('/fornecedores');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getFornecedores() {
  return await all('SELECT * FROM fornecedores ORDER BY nome ASC') as any[];
}

export async function deleteFornecedor(id: number) {
  try {
    await transaction(async () => {
      await run('UPDATE compras SET fornecedor_id = NULL WHERE fornecedor_id = ?', [id]);
      await run('DELETE FROM fornecedores WHERE id = ?', [id]);
    });
    revalidatePath('/fornecedores');
    revalidatePath('/compras');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}