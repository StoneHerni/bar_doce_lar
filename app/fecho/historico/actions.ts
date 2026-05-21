'use server';

import { all, get, run, exec, transaction, initDb } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function deleteFecho(id: number) {
  try {
    await transaction(async () => {
      await run('DELETE FROM fecho_turno_itens WHERE fecho_id = ?', [id]);
      await run('DELETE FROM fecho_turno WHERE id = ?', [id]);
    });
    revalidatePath('/fecho/historico');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
