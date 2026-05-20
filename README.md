# Gás Gasparzinho

Sistema web para gestão de revenda de gás, com painel administrativo para vendas, clientes, estoque, entregas, financeiro, cobranças, frota, equipe, recompra e fechamento diário.

## Principais áreas

- Dashboard com indicadores do dia e gráfico de vendas.
- Cadastro e consulta de clientes.
- Registro de vendas e acompanhamento de pedidos.
- Controle de estoque de produtos e botijões.
- Gestão de entregas por status.
- Cobranças, dívidas, despesas e fechamento de caixa.
- Controle de equipe por perfil de acesso.

## Tecnologias

- Next.js 14
- React 18
- TypeScript
- Prisma
- NextAuth
- Tailwind CSS
- PostgreSQL

## Como rodar localmente

Crie um arquivo `.env` na raiz do projeto:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
DIRECT_URL="postgresql://USER:PASSWORD@DIRECT_HOST:PORT/DATABASE?schema=public"
AUTH_SECRET="troque-este-segredo-em-producao"
NEXTAUTH_SECRET="troque-este-segredo-em-producao"
```

Use a URL real de um banco PostgreSQL do Supabase, Neon ou Prisma Postgres. Se quiser usar PostgreSQL local, crie o banco antes e use uma URL como `postgresql://postgres:postgres@localhost:5432/gasparzinho?schema=public`.

Instale as dependências e prepare as tabelas:

```bash
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Acesse `http://localhost:3000`.

## Usuários iniciais do seed

- Administrador: `admin@gasparzinho.com` / `admin123`
- Vendedor: `ale@gasparzinho.com` / `senha123`
- Entregador: `entregador@gasparzinho.com` / `senha123`

## Deploy na Vercel

Use um banco PostgreSQL hospedado, como Supabase, Neon ou Prisma Postgres.

Configure estas variáveis no projeto da Vercel:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
DIRECT_URL="postgresql://USER:PASSWORD@DIRECT_HOST:PORT/DATABASE?schema=public"
AUTH_SECRET="um-segredo-forte-para-producao"
NEXTAUTH_SECRET="um-segredo-forte-para-producao"
```

`DATABASE_URL` recebe a URL pooled do Neon, normalmente com `-pooler` no host. `DIRECT_URL` recebe a URL direta do Neon, sem `-pooler`, e é usada pelo Prisma para migrations. `AUTH_SECRET` e `NEXTAUTH_SECRET` recebem uma chave secreta; nunca coloque a URL do banco em `NEXTAUTH_SECRET`.

Depois do primeiro deploy, execute as migrations no banco de produção:

```bash
npx prisma migrate deploy
```
