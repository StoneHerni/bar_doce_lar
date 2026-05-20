import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { initDb } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  initDb();
  const { id } = await params;
  const items = db.prepare(`
    SELECT ci.*, p.nome as produto_nome 
    FROM compra_itens ci 
    JOIN produtos p ON ci.produto_id = p.id 
    WHERE ci.compra_id = ?
  `).all(parseInt(id)) as any[];
  
  return NextResponse.json(items);
}