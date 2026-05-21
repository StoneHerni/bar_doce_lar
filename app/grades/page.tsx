import GradesClient from './GradesClient';
import { all, get, run, exec, transaction, initDb } from '@/lib/db';
import { cookies } from 'next/headers';

export default async function GradesPage() {
  await initDb();
  const grades = await all('SELECT * FROM grades ORDER BY nome');
  const products = await all(`
    SELECT p.*, g.nome as grade_nome, g.garrafas_por_grade 
    FROM produtos p 
    LEFT JOIN grades g ON g.id = p.grade_id 
    WHERE p.ativo = 1
    ORDER BY p.nome
  `);

  const cookieStore = await cookies();
  const userCookie = cookieStore.get('user');
  let userRole: 'admin' | 'funcionario' = 'funcionario';
  
  if (userCookie) {
    try {
      const user = JSON.parse(userCookie.value);
      userRole = user.tipo;
    } catch {}
  }

  const fornecedores = await all('SELECT * FROM fornecedores ORDER BY nome');

  return (
    <GradesClient grades={grades as any[]} products={products as any[]} userRole={userRole} fornecedores={fornecedores as any[]} />
  );
}