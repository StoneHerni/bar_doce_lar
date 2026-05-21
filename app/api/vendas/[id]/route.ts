import { NextRequest, NextResponse } from 'next/server';
import { all, initDb } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await initDb();
  const { id } = await params;
  
  const items = await all(`
    SELECT vi.*, p.nome as produto_nome
    FROM venda_itens vi
    JOIN produtos p ON p.id = vi.produto_id
    WHERE vi.venda_id = ?
  `, [parseInt(id)]) as any[];
  
  return NextResponse.json(items);
}