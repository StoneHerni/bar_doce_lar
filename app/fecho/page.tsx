import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import FechoClient from './FechoClient';
import { all, get, run, exec, transaction, initDb } from '@/lib/db';

interface User {
  id: number;
  nome: string;
  email: string;
  tipo: 'admin' | 'funcionario';
}

interface Produto {
  id: number;
  nome: string;
  estoque_atual: number;
}

export default async function FechoPage() {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('user');
  
  // 1. Redireciona para o login se o utilizador não estiver autenticado
  if (!userCookie) {
    redirect('/login');
  }

  const user = JSON.parse(userCookie.value) as User;

  // 2. Apenas funcionários podem realizar fecho de turno, administradores são redirecionados para a Home
  if (user.tipo === 'admin') redirect('/');

  // 3. Carrega apenas os produtos ativos (ativo = 1) para a lista de contagem física do turno
  const produtos = await all('SELECT id, nome, estoque_atual FROM produtos WHERE ativo = 1 ORDER BY nome') as Produto[];

  return <FechoClient produtos={produtos} user={user} />;
}
