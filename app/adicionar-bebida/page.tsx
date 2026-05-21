import AdicionarBebidaClient from './AdicionarBebidaClient';
import { all, get, run, exec, transaction, initDb } from '@/lib/db';

export default async function AdicionarBebidaPage() {
  await initDb();

  const posProducts = await all(`
    SELECT pp.*, p.nome, p.estoque_atual 
    FROM pos_produtos pp 
    JOIN produtos p ON p.id = pp.produto_id 
    WHERE pp.ativo = 1 
    ORDER BY p.nome
  `) as any[];

  const availableProducts = await all(`
    SELECT * FROM produtos 
    WHERE ativo = 1 
      AND (estoque_atual > 0 OR id IN (SELECT produto_id FROM compra_itens))
      AND id NOT IN (SELECT produto_id FROM pos_produtos WHERE ativo = 1)
    ORDER BY nome
  `) as any[];

  return (
    <AdicionarBebidaClient 
      posProducts={posProducts}
      availableProducts={availableProducts}
    />
  );
}
