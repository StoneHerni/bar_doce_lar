import Database from 'better-sqlite3';
import path from 'path';
import { ADMIN_CREDENTIALS, FUNCIONARIO_CREDENTIALS } from './config';

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'bar_doce_lar.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

export function initDb() {
  db.exec(`
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

  // Migrations — adiciona colunas novas a tabelas existentes
  const prodCols = db.prepare("PRAGMA table_info(produtos)").all() as { name: string }[];
  const colNames = prodCols.map(c => c.name);
  if (!colNames.includes('grade_id')) {
    db.exec('ALTER TABLE produtos ADD COLUMN grade_id INTEGER REFERENCES grades(id)');
  }
if (!colNames.includes('garrafas_por_grade')) {
    db.exec('ALTER TABLE produtos ADD COLUMN garrafas_por_grade INTEGER DEFAULT 1');
  }
  if (!colNames.includes('ativo')) {
    db.exec('ALTER TABLE produtos ADD COLUMN ativo INTEGER DEFAULT 1');
  }

  const clienteCols = db.prepare("PRAGMA table_info(clientes)").all() as { name: string }[];
  const clienteColNames = clienteCols.map(c => c.name);
  if (!clienteColNames.includes('prazo_pagamento')) {
    db.exec('ALTER TABLE clientes ADD COLUMN prazo_pagamento TEXT');
  }

  // Migração para tabela compras - adiciona fornecedor_id e migra fornecedores antigos se existirem
  const comprasCols = db.prepare("PRAGMA table_info(compras)").all() as { name: string }[];
  const comprasColNames = comprasCols.map(c => c.name);
  if (!comprasColNames.includes('fornecedor_id')) {
    db.exec('ALTER TABLE compras ADD COLUMN fornecedor_id INTEGER REFERENCES fornecedores(id)');
    
    if (comprasColNames.includes('fornecedor')) {
      const oldPurchases = db.prepare("SELECT DISTINCT fornecedor FROM compras WHERE fornecedor IS NOT NULL AND fornecedor != ''").all() as { fornecedor: string }[];
      
      const insertFornecedor = db.prepare("INSERT INTO fornecedores (nome) VALUES (?)");
      const findFornecedor = db.prepare("SELECT id FROM fornecedores WHERE nome = ?");
      const updateCompraFornecedor = db.prepare("UPDATE compras SET fornecedor_id = ? WHERE fornecedor = ?");
      
      for (const row of oldPurchases) {
        let fornId: number | undefined;
        const existing = findFornecedor.get(row.fornecedor) as { id: number } | undefined;
        if (existing) {
          fornId = existing.id;
        } else {
          try {
            const res = insertFornecedor.run(row.fornecedor);
            fornId = res.lastInsertRowid as number;
          } catch (e) {
            console.error('Erro ao migrar fornecedor:', row.fornecedor, e);
          }
        }
        if (fornId) {
          updateCompraFornecedor.run(fornId, row.fornecedor);
        }
      }
    }
  }

  // Tabela de preços por quantidade
  try { db.exec('CREATE TABLE IF NOT EXISTS produto_precos (id INTEGER PRIMARY KEY AUTOINCREMENT, produto_id INTEGER NOT NULL, quantidade_minima INTEGER NOT NULL, preco REAL NOT NULL)'); } catch {}
  try { db.exec('CREATE TABLE IF NOT EXISTS pos_produtos (id INTEGER PRIMARY KEY AUTOINCREMENT, produto_id INTEGER UNIQUE NOT NULL, preco_venda REAL NOT NULL, ativo INTEGER DEFAULT 1)'); } catch {}

  const count = db.prepare('SELECT COUNT(*) as count FROM produtos').get() as { count: number };
  
  if (count.count === 0) {
    const insert = db.prepare('INSERT INTO produtos (nome, preco, estoque_atual) VALUES (?, ?, ?)');
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

    const insertMany = db.transaction((prods) => {
      for (const [nome, preco] of prods) {
        insert.run(nome, preco, 50);
      }
    });

    insertMany(produtosPadrao);

    const gradesPadrao = [
      ['Caixa 24', 24],
      ['Caixa 12', 12],
      ['Pack 6', 6],
      ['Pack 4', 4]
    ];
    const insertGrade = db.prepare('INSERT INTO grades (nome, garrafas_por_grade) VALUES (?, ?)');
    for (const [nome, qtd] of gradesPadrao) {
      insertGrade.run(nome, qtd);
    }
  }

  const userCount = db.prepare('SELECT COUNT(*) as count FROM usuarios').get() as { count: number };
  if (userCount.count === 0) {
    db.prepare('INSERT INTO usuarios (nome, email, senha, tipo, ativo) VALUES (?, ?, ?, ?, 1)')
      .run('Administrador', ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.senha, 'admin');
    db.prepare('INSERT INTO usuarios (nome, email, senha, tipo, ativo) VALUES (?, ?, ?, ?, 1)')
      .run('Funcionario', FUNCIONARIO_CREDENTIALS.email, FUNCIONARIO_CREDENTIALS.senha, 'funcionario');
  } else {
    // Sincroniza sempre as credenciais do config com a BD
    db.prepare('UPDATE usuarios SET email = ?, senha = ?, ativo = 1 WHERE tipo = ? AND id = (SELECT MIN(id) FROM usuarios WHERE tipo = ?)')
      .run(ADMIN_CREDENTIALS.email, ADMIN_CREDENTIALS.senha, 'admin', 'admin');
    db.prepare('UPDATE usuarios SET email = ?, senha = ?, ativo = 1 WHERE tipo = ? AND id = (SELECT MIN(id) FROM usuarios WHERE tipo = ?)')
      .run(FUNCIONARIO_CREDENTIALS.email, FUNCIONARIO_CREDENTIALS.senha, 'funcionario', 'funcionario');
  }
}

export default db;