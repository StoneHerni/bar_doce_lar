import db from '@/lib/db';
import SalesHistory from './SalesHistory';
import { cookies } from 'next/headers';
import { initDb } from '@/lib/db';

export default async function RelatoriosPage() {
  initDb();
  
  const sales = db.prepare(`
    SELECT v.*, c.nome as cliente_nome, u.nome as funcionario_nome
    FROM vendas v
    LEFT JOIN clientes c ON c.id = v.cliente_id
    LEFT JOIN usuarios u ON u.id = v.funcionario_id
    ORDER BY v.id DESC
  `).all() as any[];

  const cookieStore = await cookies();
  const userCookie = cookieStore.get('user');
  let isAdmin = false;
  
  if (userCookie) {
    try {
      const user = JSON.parse(userCookie.value);
      isAdmin = user.tipo === 'admin';
    } catch {}
  }

  return <SalesHistory sales={sales} isAdmin={isAdmin} />;
}