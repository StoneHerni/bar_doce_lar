import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import db from '@/lib/db';
import HistoricoFechoClient from './HistoricoFechoClient';

export default async function HistoricoFechoPage() {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('user');
  if (!userCookie) redirect('/login');

  const user = JSON.parse(userCookie.value);

  const fechos = db.prepare(`
    SELECT ft.id, ft.data, ft.observacao, ft.created_at, u.nome as funcionario_nome
    FROM fecho_turno ft
    JOIN usuarios u ON ft.funcionario_id = u.id
    ORDER BY ft.created_at DESC
  `).all() as any[];

  const itens = db.prepare(`
    SELECT fti.fecho_id, fti.quantidade, p.nome as produto_nome
    FROM fecho_turno_itens fti
    JOIN produtos p ON fti.produto_id = p.id
  `).all() as any[];

  return <HistoricoFechoClient fechos={fechos} itens={itens} userTipo={user.tipo} />;
}
