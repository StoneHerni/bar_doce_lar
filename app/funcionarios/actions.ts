'use server';

import db from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function createFuncionario(nome: string, email: string, senha: string, tipo: 'admin' | 'funcionario') {
  try {
    const existing = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email);
    if (existing) {
      return { success: false, error: 'Email já está em uso' };
    }
    
    db.prepare('INSERT INTO usuarios (nome, email, senha, tipo) VALUES (?, ?, ?, ?)')
      .run(nome, email, senha, tipo);
    
    revalidatePath('/funcionarios');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function toggleFuncionario(id: number, ativo: boolean) {
  try {
    db.prepare('UPDATE usuarios SET ativo = ? WHERE id = ?').run(ativo ? 1 : 0, id);
    revalidatePath('/funcionarios');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateSenha(id: number, novaSenha: string) {
  try {
    db.prepare('UPDATE usuarios SET senha = ? WHERE id = ?').run(novaSenha, id);
    revalidatePath('/funcionarios');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteFuncionario(id: number) {
  try {
    db.prepare('DELETE FROM usuarios WHERE id = ?').run(id);
    revalidatePath('/funcionarios');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
