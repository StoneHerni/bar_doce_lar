'use server';

import { all, get, run, exec, transaction, initDb } from '@/lib/db';
import { cookies } from 'next/headers';

export interface User {
  id: number;
  nome: string;
  email: string;
  tipo: 'admin' | 'funcionario';
}

export async function login(email: string, senha: string) {
  const user = await get('SELECT id, nome, email, tipo FROM usuarios WHERE email = ? AND senha = ? AND ativo = 1', [email, senha]) as User | undefined;

  if (!user) {
    return { success: false, error: 'Email ou senha incorretos' };
  }

  const cookieStore = await cookies();
  cookieStore.set('user', JSON.stringify(user), {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
  });

  return { success: true, user };
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete('user');
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('user');
  
  if (!userCookie) return null;
  
  try {
    const user = JSON.parse(userCookie.value);
    if (!user || !user.id) return null;
    return user as User;
  } catch {
    cookieStore.delete('user');
    return null;
  }
}

export async function clearUserCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('user');
}
