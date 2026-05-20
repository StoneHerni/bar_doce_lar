'use server';

import db from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function createFornecedor(nome: string, telefone: string) {
  try {
    const existing = db.prepare('SELECT id FROM fornecedores WHERE nome = ?').get(nome);
    if (existing) {
      return { success: false, error: 'Fornecedor já existe' };
    }
    db.prepare('INSERT INTO fornecedores (nome, telefone) VALUES (?, ?)').run(nome, telefone);
    revalidatePath('/fornecedores');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getFornecedores() {
  return db.prepare('SELECT * FROM fornecedores ORDER BY nome ASC').all() as any[];
}

export async function deleteFornecedor(id: number) {
  const transaction = db.transaction(() => {
    db.prepare('UPDATE compras SET fornecedor_id = NULL WHERE fornecedor_id = ?').run(id);
    db.prepare('DELETE FROM fornecedores WHERE id = ?').run(id);
  });

  try {
    transaction();
    revalidatePath('/fornecedores');
    revalidatePath('/compras');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}