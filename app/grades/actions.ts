'use server';

import db from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function createGrade(nome: string, garrafasPorGrade: number) {
  try {
    const existing = db.prepare('SELECT id FROM grades WHERE nome = ?').get(nome);
    if (existing) {
      return { success: false, error: 'Grade já existe' };
    }
    
    db.prepare('INSERT INTO grades (nome, garrafas_por_grade) VALUES (?, ?)')
      .run(nome, garrafasPorGrade);
    
    revalidatePath('/grades');
    revalidatePath('/estoque');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateGrade(id: number, nome: string, garrafasPorGrade: number) {
  try {
    const existing = db.prepare('SELECT id FROM grades WHERE nome = ? AND id != ?').get(nome, id);
    if (existing) {
      return { success: false, error: 'Já existe uma grade com esse nome' };
    }
    
    db.prepare('UPDATE grades SET nome = ?, garrafas_por_grade = ? WHERE id = ?')
      .run(nome, garrafasPorGrade, id);
    
    revalidatePath('/grades');
    revalidatePath('/estoque');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteGrade(id: number) {
  try {
    const transaction = db.transaction(() => {
      // 1. Atualiza todos os produtos que usavam esta grade para "Sem grade" (grade_id = NULL)
      db.prepare('UPDATE produtos SET grade_id = NULL WHERE grade_id = ?').run(id);
      
      // 2. Elimina a grade
      db.prepare('DELETE FROM grades WHERE id = ?').run(id);
    });

    transaction();

    revalidatePath('/grades');
    revalidatePath('/estoque');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getGrades() {
  return db.prepare('SELECT * FROM grades ORDER BY nome').all();
}