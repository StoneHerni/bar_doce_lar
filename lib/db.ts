import { createClient } from '@libsql/client';
import path from 'path';
import { ADMIN_CREDENTIALS, FUNCIONARIO_CREDENTIALS } from './config';

const url = process.env.TURSO_DATABASE_URL || `file:${path.join(process.cwd(), 'bar_doce_lar.db')}`;
const authToken = process.env.TURSO_AUTH_TOKEN;

const db = createClient({ url, authToken, intMode: 'number' });

export async function all(sql: string, args?: any[]) {
  const rs = await db.execute({ sql, args });
  return rs.rows as any[];
}

export async function get(sql: string, args?: any[]) {
  const rs = await db.execute({ sql, args });
  return (rs.rows[0] ?? null) as any;
}

export async function run(sql: string, args?: any[]) {
  const rs = await db.execute({ sql, args });
  return {
    lastInsertRowid: rs.lastInsertRowid !== undefined ? Number(rs.lastInsertRowid) : undefined,
    changes: rs.rowsAffected,
  };
}

export async function exec(sql: string) {
  await db.executeMultiple(sql);
}

export async function transaction<T>(fn: () => Promise<T>): Promise<T> {
  const tx = await db.transaction('write');
  try {
    const result = await fn();
    await tx.commit();
    return result;
  } catch (e) {
    await tx.rollback();
    throw e;
  } finally {
    tx.close();
  }
}

export async function initDb() {
  await exec(`
    CREATE TABLE IF NOT EXISTS grades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT UNIQUE,
        garrafas_por_grade INTEGER DEFAULT 24,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS produtos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT UNIQUE,
        preco REAL,
        grade_id INTEGER,
        garrafas_por_grade INTEGER DEFAULT 1,
        estoque_atual INTEGER DEFAULT 0,
        estoque_minimo INTEGER DEFAULT 10,
        FOREIGN KEY(grade_id) REFERENCES grades(id)
    );

    CREATE TABLE IF NOT EXISTS fornecedores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        telefone TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS compras (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data TEXT,
        fornecedor_id INTEGER,
        total REAL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(fornecedor_id) REFERENCES fornecedores(id)
    );

    CREATE TABLE IF NOT EXISTS compra_itens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        compra_id INTEGER,
        produto_id INTEGER,
        quantidade_grade INTEGER,
        quantidade_garrafas INTEGER,
        preco_grade REAL,
        FOREIGN KEY(compra_id) REFERENCES compras(id),
        FOREIGN KEY(produto_id) REFERENCES produtos(id)
    );

    CREATE TABLE IF NOT EXISTS clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT,
        telefone TEXT,
        limite_credito REAL DEFAULT 5000
    );

    CREATE TABLE IF NOT EXISTS vendas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data TEXT,
        cliente_id INTEGER,
        tipo_pagamento TEXT,
        total REAL,
        pago REAL,
        divida REAL,
        FOREIGN KEY(cliente_id) REFERENCES clientes(id)
    );

    CREATE TABLE IF NOT EXISTS venda_itens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        venda_id INTEGER,
        produto_id INTEGER,
        quantidade INTEGER,
        preco_unitario REAL,
        FOREIGN KEY(venda_id) REFERENCES vendas(id),
        FOREIGN KEY(produto_id) REFERENCES produtos(id)
    );

    CREATE TABLE IF NOT EXISTS perdas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data TEXT,
        produto_id INTEGER,
        quantidade INTEGER,
        motivo TEXT,
        FOREIGN KEY(produto_id) REFERENCES produtos(id)
    );

    CREATE TABLE IF NOT EXISTS caixa (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data TEXT,
        descricao TEXT,
        tipo TEXT,
        valor REAL
    );

    CREATE TABLE IF NOT EXISTS fecho_turno (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data TEXT,
        funcionario_id INTEGER,
        observacao TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(funcionario_id) REFERENCES usuarios(id)
    );

    CREATE TABLE IF NOT EXISTS fecho_turno_itens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fecho_id INTEGER,
        produto_id INTEGER,
        quantidade INTEGER,
        FOREIGN KEY(fecho_id) REFERENCES fecho_turno(id),
        FOREIGN KEY(produto_id) REFERENCES produtos(id)
    );

    CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT,
        email TEXT UNIQUE,
        senha TEXT,
        tipo TEXT DEFAULT 'funcionario',
        ativo INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS movimentos_estoque (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data TEXT DEFAULT CURRENT_TIMESTAMP,
        produto_id INTEGER,
        tipo TEXT NOT NULL,
        quantidade INTEGER NOT NULL,
        descricao TEXT,
        referencia_id INTEGER,
        FOREIGN KEY(produto_id) REFERENCES produtos(id)
    );

    CREATE TABLE IF NOT EXISTS configuracoes (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        nome_empresa TEXT DEFAULT 'Bar Doce Lar',
        estoque_minimo_padrao INTEGER DEFAULT 10,
        limite_fiado_padrao REAL DEFAULT 5000
    );
  `);

  // Migrations
  const tableInfo = await all("PRAGMA table_info(produtos)") as { name: string }[];
  const colNames = tableInfo.map(c => c.name);
  if (!colNames.includes('grade_id')) {
    await exec('ALTER TABLE produtos ADD COLUMN grade_id INTEGER REFERENCES grades(id)');
  }
  if (!colNames.includes('garrafas_por_grade')) {
    await exec('ALTER TABLE produtos ADD COLUMN garrafas_por_grade INTEGER DEFAULT 1');
  }
  if (!colNames.includes('ativo')) {
    await exec('ALTER TABLE produtos ADD COLUMN ativo INTEGER DEFAULT 1');
  }

  const clienteCols = await all("PRAGMA table_info(clientes)") as { name: string }[];
  const clienteColNames = clienteCols.map(c => c.name);
  if (!clienteColNames.includes('prazo_pagamento')) {
    await exec('ALTER TABLE clientes ADD COLUMN prazo_pagamento TEXT');
  }

  const vendasCols = await all("PRAGMA table_info(vendas)") as { name: string }[];
  const vendasColNames = vendasCols.map(c => c.name);
  if (!vendasColNames.includes('funcionario_id')) {
    await exec('ALTER TABLE vendas ADD COLUMN funcionario_id INTEGER REFERENCES usuarios(id)');
  }

  // Migration para tabela compras
  const comprasCols = await all("PRAGMA table_info(compras)") as { name: string }[];
  const comprasColNames = comprasCols.map(c => c.name);
  if (!comprasColNames.includes('fornecedor_id')) {
    await exec('ALTER TABLE compras ADD COLUMN fornecedor_id INTEGER REFERENCES fornecedores(id)');

    if (comprasColNames.includes('fornecedor')) {
      const oldPurchases = await all("SELECT DISTINCT fornecedor FROM compras WHERE fornecedor IS NOT NULL AND fornecedor != ''") as { fornecedor: string }[];

      for (const row of oldPurchases) {
        let fornId: number | undefined;
        const existing = await get("SELECT id FROM fornecedores WHERE nome = ?", [row.fornecedor]) as { id: number } | undefined;
        if (existing) {
          fornId = existing.id;
        } else {
          try {
            const res = await run("INSERT INTO fornecedores (nome) VALUES (?)", [row.fornecedor]);
            fornId = res.lastInsertRowid as number;
          } catch (e) {
            console.error('Erro ao migrar fornecedor:', row.fornecedor, e);
          }
        }
        if (fornId) {
          await run("UPDATE compras SET fornecedor_id = ? WHERE fornecedor = ?", [fornId, row.fornecedor]);
        }
      }
    }
  }

  try { await exec('CREATE TABLE IF NOT EXISTS produto_precos (id INTEGER PRIMARY KEY AUTOINCREMENT, produto_id INTEGER NOT NULL, quantidade_minima INTEGER NOT NULL, preco REAL NOT NULL)'); } catch {}
  try { await exec('CREATE TABLE IF NOT EXISTS pos_produtos (id INTEGER PRIMARY KEY AUTOINCREMENT, produto_id INTEGER UNIQUE NOT NULL, preco_venda REAL NOT NULL, ativo INTEGER DEFAULT 1)'); } catch {}

  const count = await get('SELECT COUNT(*) as count FROM produtos') as { count: number };

  if (count.count === 0) {
    const produtosPadrao = [
      ["Cana joy", 300], ["Yala", 300], ["Regal", 250], ["Top", 200],
      ["Coca-cola", 300], ["Smirnoff", 1000], ["Vat", 500], ["Cuca em Lata", 500],
      ["Bosster em lata", 600], ["Fresco pequeno", 800], ["Pias", 700],
      ["Dikota", 600], ["Valmonte", 800], ["Fresco grande", 2300],
      ["Monte godel", 2300], ["Festa", 500], ["Chefe grande", 600],
      ["Smirnof g", 500], ["Doppel", 333.33], ["Cuca", 333.33], ["Eka", 333.33],
      ["Nocal", 333.33], ["booster", 333.33], ["Tigra", 300], ["N.Natural", 800],
      ["Água", 150]
    ];

    await transaction(async () => {
      for (const [nome, preco] of produtosPadrao) {
        await run('INSERT INTO produtos (nome, preco, estoque_atual) VALUES (?, ?, ?)', [nome, preco, 50]);
      }
    });

    const gradesPadrao = [
      ['Caixa 24', 24],
      ['Caixa 12', 12],
      ['Pack 6', 6],
      ['Pack 4', 4]
    ];
    for (const [nome, qtd] of gradesPadrao) {
      await run('INSERT INTO grades (nome, garrafas_por_grade) VALUES (?, ?)', [nome, qtd]);
    }
  }

  const userCount = await get('SELECT COUNT(*) as count FROM usuarios') as { count: number };
  if (userCount.count === 0) {
    await run('INSERT INTO usuarios (nome, email, senha, tipo, ativo) VALUES (?, ?, ?, ?, 1)',
      [ADMIN_CREDENTIALS.nome, 'admin@bar.com', ADMIN_CREDENTIALS.senha, 'admin']);
    await run('INSERT INTO usuarios (nome, email, senha, tipo, ativo) VALUES (?, ?, ?, ?, 1)',
      [FUNCIONARIO_CREDENTIALS.nome, 'func@bar.com', FUNCIONARIO_CREDENTIALS.senha, 'funcionario']);
  } else {
    await run('UPDATE usuarios SET nome = ?, senha = ?, ativo = 1 WHERE tipo = ? AND id = (SELECT MIN(id) FROM usuarios WHERE tipo = ?)',
      [ADMIN_CREDENTIALS.nome, ADMIN_CREDENTIALS.senha, 'admin', 'admin']);
    await run('UPDATE usuarios SET nome = ?, senha = ?, ativo = 1 WHERE tipo = ? AND id = (SELECT MIN(id) FROM usuarios WHERE tipo = ?)',
      [FUNCIONARIO_CREDENTIALS.nome, FUNCIONARIO_CREDENTIALS.senha, 'funcionario', 'funcionario']);
  }
}

export default db;
