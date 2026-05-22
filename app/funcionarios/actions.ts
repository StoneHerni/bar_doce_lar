'use server';

import { all, get, run, exec, transaction, initDb } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function createFuncionario(nome: string, email: string, senha: string, tipo: 'admin' | 'funcionario') {
  try {
    const existing = await get('SELECT id FROM usuarios WHERE email = ?', [email]);
    if (existing) {
      return { success: false, error: 'Email já está em uso' };
    }
    
    await run('INSERT INTO usuarios (nome, email, senha, tipo) VALUES (?, ?, ?, ?)', [nome, email, senha, tipo]);
    
    revalidatePath('/funcionarios');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function toggleFuncionario(id: number, ativo: boolean) {
  try {
    await run('UPDATE usuarios SET ativo = ? WHERE id = ?', [ativo ? 1 : 0, id]);
    revalidatePath('/funcionarios');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateSenha(id: number, novaSenha: string) {
  try {
    await run('UPDATE usuarios SET senha = ? WHERE id = ?', [novaSenha, id]);
    revalidatePath('/funcionarios');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateFuncionario(id: number, nome: string, email: string, tipo: 'admin' | 'funcionario', senha?: string) {
  try {
    const existing = await get('SELECT id FROM usuarios WHERE email = ? AND id != ?', [email, id]);
    if (existing) {
      return { success: false, error: 'Email já está em uso por outro funcionário' };
    }

    if (senha) {
      await run('UPDATE usuarios SET nome = ?, email = ?, tipo = ?, senha = ? WHERE id = ?', [nome, email, tipo, senha, id]);
    } else {
      await run('UPDATE usuarios SET nome = ?, email = ?, tipo = ? WHERE id = ?', [nome, email, tipo, id]);
    }

    revalidatePath('/funcionarios');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteFuncionario(id: number) {
  try {
    await run('DELETE FROM usuarios WHERE id = ?', [id]);
    revalidatePath('/funcionarios');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
