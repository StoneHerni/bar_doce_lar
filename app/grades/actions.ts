'use server';

import { all, get, run, exec, transaction, initDb } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function createGrade(nome: string, garrafasPorGrade: number) {
  try {
    const existing = await get('SELECT id FROM grades WHERE nome = ?', [nome]);
    if (existing) {
      return { success: false, error: 'Grade já existe' };
    }
    
    await run('INSERT INTO grades (nome, garrafas_por_grade) VALUES (?, ?)', [nome, garrafasPorGrade]);
    
    revalidatePath('/grades');
    revalidatePath('/estoque');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateGrade(id: number, nome: string, garrafasPorGrade: number) {
  try {
    const existing = await get('SELECT id FROM grades WHERE nome = ? AND id != ?', [nome, id]);
    if (existing) {
      return { success: false, error: 'Já existe uma grade com esse nome' };
    }
    
    await run('UPDATE grades SET nome = ?, garrafas_por_grade = ? WHERE id = ?', [nome, garrafasPorGrade, id]);
    
    revalidatePath('/grades');
    revalidatePath('/estoque');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteGrade(id: number) {
  try {
    await transaction(async () => {
      // 1. Atualiza todos os produtos que usavam esta grade para "Sem grade" (grade_id = NULL)
      await run('UPDATE produtos SET grade_id = NULL WHERE grade_id = ?', [id]);
      
      // 2. Elimina a grade
      await run('DELETE FROM grades WHERE id = ?', [id]);
    });

    revalidatePath('/grades');
    revalidatePath('/estoque');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getGrades() {
  return await all('SELECT * FROM grades ORDER BY nome');
}