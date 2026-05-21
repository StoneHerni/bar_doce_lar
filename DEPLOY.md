# Guia de Implantação (Deploy) — Bar Doce Lar

Este guia explica como preparar e implantar o sistema **Bar Doce Lar** em ambiente de produção.

---

## 1. Arquitetura Atual

O sistema usa **SQLite** como banco de dados através do pacote `@libsql/client` (Turso).

- **Desenvolvimento local:** Usa um ficheiro SQLite local (`bar_doce_lar.db`) via URL `file:`.
- **Produção (Render Free):** Conecta-se a uma base de dados **Turso** na nuvem, eliminando a necessidade de discos persistentes.

Isto significa que o deploy funciona **no plano Free do Render** sem perda de dados.

---

## 2. Criar uma Base de Dados no Turso (Grátis)

O Turso oferece um plano gratuito com 500 MB de armazenamento e 1 bilhão de leituras por mês.

### Passo a Passo:

1. Crie uma conta em [turso.tech](https://turso.tech) (pode usar GitHub).

2. Instale a CLI do Turso:
```bash
npm install -g @turso/cli
```

3. Faça login:
```bash
turso auth login
```

4. Crie uma base de dados:
```bash
turso db create bar-doce-lar
```

5. Obtenha o URL de conexão:
```bash
turso db show bar-doce-lar --url
```
> Exemplo: `libsql://bar-doce-lar-username.turso.io`

6. Gere um token de autenticação:
```bash
turso db tokens create bar-doce-lar
```
> Copie o token gerado (começa com `eyJ...`).

---

## 3. Configurar no Render (Painel Web)

### Web Service

| Campo | Valor |
|-------|-------|
| **Runtime** | `Node` |
| **Build Command** | `npm install; npm run build` |
| **Start Command** | `node .next/standalone/server.js` |
| **Plan** | **Free** ✅ (qualquer plano funciona) |

### Environment Variables

| Variável | Valor | Descrição |
|----------|-------|-----------|
| `TURSO_DATABASE_URL` | `https://bar-doce-lar-stoneherni.aws-us-east-2.turso.io` | URL da base de dados Turso |
| `TURSO_AUTH_TOKEN` | `eyJ...` | Token de autenticação gerado acima |
| `NODE_ENV` | `production` | Ambiente de produção |
| `NEXT_TELEMETRY_DISABLED` | `1` | Desativa telemetria |

### ⚠️ Nota: Não precisa de adicionar Disk

Como a base de dados está na nuvem (Turso), **não é necessário configurar um volume persistente** no Render. O plano Free funciona perfeitamente.

---

## 4. Desenvolvimento Local

Localmente, o sistema usa um ficheiro SQLite diretamente (sem precisar de Turso):

```bash
npm run dev
```

A base de dados será criada automaticamente em `bar_doce_lar.db` na raiz do projeto.

Se quiser testar com Turso localmente, defina as variáveis de ambiente:
```bash
$env:TURSO_DATABASE_URL="libsql://bar-doce-lar-username.turso.io"
$env:TURSO_AUTH_TOKEN="eyJ..."
npm run dev
```

---

## 5. Seed Inicial

Na primeira execução, o sistema cria automaticamente:
- Todas as tabelas necessárias
- Um administrador padrão (`josemar@gmail.com` / `herny`)
- Um funcionário padrão (`func@bar.com` / `func123`)
- Produtos iniciais e grades
