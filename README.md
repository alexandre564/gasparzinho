# Gás Gasparzinho

Sistema web para gestão de revenda de gás, com painel administrativo para vendas, clientes, estoque, entregas, financeiro, cobranças, frota, equipe, fidelização e fechamento diário.

## Principais áreas

- Página principal com indicadores do dia e gráfico de vendas.
- Cadastro e consulta de clientes.
- Registro de vendas e acompanhamento de pedidos.
- Controle de estoque de produtos e botijões.
- Gestão de entregas por status.
- Cobranças, dívidas, despesas e fechamento de caixa.
- Fidelização com previsão de novas compras por histórico.
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

Use a URL real de um banco PostgreSQL do Supabase, Neon ou Prisma Postgres. No Neon, `DATABASE_URL` pode usar o host com `-pooler`; `DIRECT_URL` deve usar o host sem `-pooler`.

Instale as dependências e prepare as tabelas:

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev -- --port 3004
```

Acesse `http://localhost:3004`.

## Usuários iniciais do seed

- Administrador: `admin@gasparzinho.com` / `admin123`
- Alexandre: `alexandrejo@gmail.com` / `admin123`
- Vendedor: `ale@gasparzinho.com` / `senha123`
- Entregador: `entregador@gasparzinho.com` / `senha123`

## Deploy na Vercel

Configure estas variáveis no projeto da Vercel:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST-POOLER:PORT/DATABASE?sslmode=verify-full&schema=gasparzinho_v2_dev"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=verify-full&schema=gasparzinho_v2_dev"
AUTH_SECRET="um-segredo-forte-para-producao"
NEXTAUTH_SECRET="um-segredo-forte-para-producao"
```

`DATABASE_URL` recebe a URL pooled do Neon, normalmente com `-pooler` no host. `DIRECT_URL` recebe a URL direta do Neon, sem `-pooler`, e é usada pelo Prisma para migrations. `AUTH_SECRET` e `NEXTAUTH_SECRET` recebem uma chave secreta; nunca coloque a URL do banco em `NEXTAUTH_SECRET`.

Antes do primeiro deploy, aplique as migrations com `npm run db:deploy` e rode o seed com `npm run db:seed` quando precisar recriar os usuários iniciais. O build executa `prisma generate` e `next build`.
