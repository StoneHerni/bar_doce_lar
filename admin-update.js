const { createClient } = require('@libsql/client');

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    console.error('ERRO: Define TURSO_DATABASE_URL e TURSO_AUTH_TOKEN');
    process.exit(1);
  }

  const db = createClient({ url, authToken, intMode: 'number' });

  const admin = await db.execute("SELECT id FROM usuarios WHERE tipo = 'admin'");
  
  if (admin.rows.length === 0) {
    await db.execute({
      sql: "INSERT INTO usuarios (nome, email, senha, tipo, ativo) VALUES (?, ?, ?, 'admin', 1)",
      args: ['josemar', 'admin@bar.com', '123']
    });
    console.log('Admin criado: josemar / 123');
  } else {
    await db.execute({
      sql: 'UPDATE usuarios SET nome = ?, senha = ?, ativo = 1 WHERE id = ?',
      args: ['josemar', '123', admin.rows[0].id]
    });
    console.log('Admin atualizado: josemar / 123');
  }

  db.close();
}

main().catch(e => console.error('Erro:', e.message));
