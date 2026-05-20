# Guia de Implantação (Deploy) — Bar Doce Lar

Este guia explica como preparar e implantar o sistema **Bar Doce Lar** em ambiente de produção.

---

## 1. O Desafio do SQLite na Vercel (Importante)

A Vercel é uma plataforma voltada para aplicações **sem estado (stateless)** e baseada em **funções Serverless**. Isto traz dois grandes problemas para o nosso projeto atual:

1.  **Ficheiros temporários / Perda de Dados:** Sempre que a aplicação fica inativa por alguns minutos na Vercel, o servidor é "desligado". Ao iniciar novamente, qualquer gravação feita no ficheiro local `bar_doce_lar.db` será **completamente perdida**, restaurando o banco de dados para o estado inicial.
2.  **Módulos Nativos compilados em C++:** O pacote `better-sqlite3` usa código compilado para a arquitetura local. A Vercel frequentemente falha em empacotar esses binários, gerando erros de execução (ex.: `Module not found` ou `Internal Server Error`).

---

## 2. Opções Recomendadas de Deploy (Mantendo SQLite)

Para manter o banco de dados SQLite local funcionando perfeitamente sem perder dados e sem precisar de alterar as consultas SQL do código, recomendamos utilizar plataformas PaaS que suportam **volumes de disco persistentes**:

### Opção A: Railway (Recomendada - Mais Fácil)
A Railway permite executar servidores Next.js completos com discos rígidos virtuais permanentes anexados à aplicação.

#### Passo a Passo no Railway:
1.  Crie uma conta em [Railway.app](https://railway.app/).
2.  Crie um novo projeto e conecte com o seu repositório do GitHub.
3.  Nas configurações do serviço no Railway:
    *   Vá a **Settings** -> **Volumes** -> Clique em **Add Volume** para criar um disco persistente (ex.: dê o nome de `data`). Defina o Mount Path como `/data`.
    *   Vá a **Variables** e configure as seguintes variáveis de ambiente:
        *   `DATABASE_PATH` = `/data/bar_doce_lar.db` *(Isto direciona o SQLite para salvar o ficheiro no disco permanente)*
        *   `PORT` = `3000`
4.  A Railway detetará o Next.js automaticamente, fará o build standalone otimizado e colocará o sistema online.

---

### Opção B: Render
Semelhante à Railway, a Render permite criar um serviço web com um "Disk" anexado.

#### Passo a Passo na Render:
1.  Crie uma conta em [Render.com](https://render.com/).
2.  Crie um novo **Web Service** e conecte o seu repositório GitHub.
3.  Nas configurações:
    *   **Runtime:** `Node`
    *   **Build Command:** `npm run build`
    *   **Start Command:** `node .next/standalone/server.js` (ou use a configuração padrão se a Render detetar automaticamente)
4.  Vá à aba **Disks**:
    *   Clique em **Add Disk**.
    *   **Name:** `data-volume`
    *   **Mount Path:** `/data`
5.  Vá à aba **Environment**:
    *   Adicione a variável `DATABASE_PATH` com o valor `/data/bar_doce_lar.db`.

---

## 3. Preparação Efetuada no Código
Para viabilizar estes deploys, o código foi otimizado com duas alterações críticas:

1.  **Suporte a volumes persistentes no Banco ([lib/db.ts](file:///c:/Bar_Josimar/lib/db.ts)):**
    O caminho do banco de dados agora lê uma variável de ambiente se estiver disponível:
    ```typescript
    const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'bar_doce_lar.db');
    ```
    Desta forma, localmente o sistema usa o ficheiro na raiz (`bar_doce_lar.db`), e em produção usa o caminho do volume montado (ex.: `/data/bar_doce_lar.db`).

2.  **Build Standalone ([next.config.ts](file:///c:/Bar_Josimar/next.config.ts)):**
    Ativamos a opção `standalone` nas configurações do Next.js. Isso instrui o Next.js a empacotar apenas os arquivos estritamente necessários para o servidor rodar em plataformas como Railway/Render, acelerando o tempo de build e reduzindo o consumo de memória.

---

## 4. E se eu quiser MESMO usar a Vercel?
Se o deploy na Vercel for obrigatório, precisará de fazer o seguinte:

1.  **Migrar o Banco de Dados para a Nuvem:** Hospedar a sua base de dados no **Turso** (SQLite serverless na nuvem).
2.  **Instalar o cliente LibSQL:** `npm install @libsql/client`.
3.  **Reescrever o código:** Como a conexão com a nuvem é obrigatoriamente assíncrona, terá de alterar todas as consultas do projeto (`db.prepare().all()`, `db.prepare().run()`) para versões assíncronas com `await` (ex.: `await db.execute(...)`). Isto exigirá a alteração de cerca de 15 a 20 ficheiros de Server Actions e Server Components.
