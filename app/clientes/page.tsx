import { all, get, run, exec, transaction, initDb } from '@/lib/db';
import CustomersClient from './CustomersClient';
import { cookies } from 'next/headers';

async function getCustomersWithDebt() {
  return await all(`
    SELECT 
      c.*, 
      IFNULL((SELECT SUM(divida) FROM vendas WHERE cliente_id = c.id AND divida > 0), 0) as divida_total
    FROM clientes c
    ORDER BY divida_total DESC, c.nome ASC
  `) as any[];
}

export default async function CustomersPage() {
  const customers = await getCustomersWithDebt();
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('user');
  const user = userCookie ? JSON.parse(userCookie.value) : null;

  return (
    <CustomersClient initialCustomers={customers} userTipo={user?.tipo ?? 'funcionario'} />
  );
}
