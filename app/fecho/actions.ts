'use server';

import { all, run, transaction } from '@/lib/db';

interface Item {
  produto_id: number;
  quantidade: number;
  quantidade_prateleira: number;
  quantidade_arca: number;
}

export async function createFechoTurno(data: {
  funcionarioId: number;
  observacao: string;
  itens: Item[];
}) {
  const { funcionarioId, observacao, itens } = data;
  const today = new Date().toISOString().split('T')[0];

  try {
    const fechoId = await transaction(async () => {
      const result = await run(`
        INSERT INTO fecho_turno (data, funcionario_id, observacao)
        VALUES (?, ?, ?)
      `, [today, funcionarioId, observacao]);

      const fechoId = result.lastInsertRowid;

      for (const item of itens) {
        await run(`
          INSERT INTO fecho_turno_itens (fecho_id, produto_id, quantidade, quantidade_prateleira, quantidade_arca)
          VALUES (?, ?, ?, ?, ?)
        `, [fechoId, item.produto_id, item.quantidade, item.quantidade_prateleira, item.quantidade_arca]);
      }

      return fechoId;
    });
    return { success: true, fechoId };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getFechoTurnoByDate(date: string) {
  return await all(`
    SELECT ft.*, u.nome as funcionario_nome
    FROM fecho_turno ft
    JOIN usuarios u ON ft.funcionario_id = u.id
    WHERE ft.data = ?
    ORDER BY ft.created_at DESC
  `, [date]);
}

export async function getFechoTurnoItens(fechoId: number) {
  return await all(`
    SELECT fti.*, p.nome as produto_nome
    FROM fecho_turno_itens fti
    JOIN produtos p ON fti.produto_id = p.id
    WHERE fti.fecho_id = ?
  `, [fechoId]);
}
