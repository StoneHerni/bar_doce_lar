'use server';

import db from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function deleteFecho(id: number) {
  try {
    db.transaction(() => {
      db.prepare('DELETE FROM fecho_turno_itens WHERE fecho_id = ?').run(id);
      db.prepare('DELETE FROM fecho_turno WHERE id = ?').run(id);
    })();
    revalidatePath('/fecho/historico');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
