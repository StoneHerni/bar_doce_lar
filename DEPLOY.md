# Guia de Implantação (Deploy) — Bar Doce Lar

---

## 1. Arquitetura

O sistema usa **SQLite na nuvem** via Turso, com o pacote `@libsql/client`.

- **Local:** Ficheiro SQLite local (`bar_doce_lar.db`) via `file:`
- **Produção:** Base de dados Turso na nuvem via `https://`

Isto permite deploy em qualquer plataforma (Vercel, Render, Railway) sem perder dados.

---

## 2. Criar Base de Dados no Turso (Grátis)

1. Crie conta em [turso.tech](https://turso.tech)
2. Crie uma base de dados (`bar-doce-lar`)
3. Guarde o **URL** e o **Token** de acesso

---

## 3. Deploy na Vercel

1. Conecte o repositório GitHub na [Vercel](https://vercel.com)
2. A Vercel deteta Next.js automaticamente
3. Em **Environment Variables**, adicione:

| Variável | Valor |
|----------|-------|
| `TURSO_DATABASE_URL` | `https://...` (URL do Turso) |
| `TURSO_AUTH_TOKEN` | `eyJ...` (token do Turso) |

4. Clique em **Deploy**

Não precisa de configurar Build ou Start Command — a Vercel faz tudo automaticamente.
