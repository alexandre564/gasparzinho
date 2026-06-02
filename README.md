# Gas Gasparzinho

Sistema web para gestao de revenda de gas, com painel administrativo para vendas, clientes, estoque, entregas, financeiro, cobrancas, frota, equipe, fidelizacao, filiais e fechamento diario.

## Principais areas

- Pagina principal com indicadores do dia e grafico de vendas.
- Cadastro e consulta de clientes.
- Registro de vendas e acompanhamento de pedidos.
- Controle de estoque de produtos e botijoes.
- Gestao de entregas por status.
- Cobrancas, dividas, despesas e fechamento de caixa.
- Fidelizacao com previsao de novas compras por historico.
- Controle de equipe por perfil de acesso.
- Modulo de filiais para evolucao da plataforma Gas.

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

Instale as dependencias e prepare as tabelas:

```bash
npm install
npm run db:migrate
npm run db:seed
npm run dev -- --port 3004
```

Acesse `http://localhost:3004`.

## Auditoria e smoke E2E

Com o servidor local aberto na porta 3004:

```bash
npm run e2e:smoke
npm run e2e:critical
```

Auditorias recomendadas antes de publicar mudancas:

```bash
npm run flows:audit
npm run branches:audit
npm run branches:schema-audit
npm run data:audit
npm run branches:data-audit
```

Antes das auditorias de dados, use `npm run data:diagnose` para confirmar qual URL, schema e host serao usados. Se o ambiente bloquear rede para o Neon, rode os comandos no PowerShell local com as variaveis carregadas. Tambem e possivel informar uma URL exclusiva para auditoria:

```bash
AUDIT_DATABASE_URL="postgresql://..." npm run data:audit
```

No PowerShell:

```powershell
$env:AUDIT_DATABASE_URL="postgresql://..."
npm run data:audit
```

`npm run data:repair` simula reparos operacionais sem gravar no banco. Para aplicar de fato, revise a simulacao e rode `npm run data:repair:apply`.

Para preparar um teste manual com uma segunda filial, simule primeiro e aplique apenas depois de revisar:

```bash
npm run branches:seed-test
npm run branches:seed-test:apply
```

## Usuarios iniciais do seed

- Administrador: `admin@gasparzinho.com` / `admin123`
- Alexandre: `alexandrejo@gmail.com` / `admin123`
- Vendedor: `ale@gasparzinho.com` / `senha123`
- Entregador: `entregador@gasparzinho.com` / `senha123`

## Deploy na Vercel

Configure estas variaveis no projeto da Vercel:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST-POOLER:PORT/DATABASE?sslmode=verify-full&schema=gasparzinho_v2_dev"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=verify-full&schema=gasparzinho_v2_dev"
AUTH_SECRET="um-segredo-forte-para-producao"
NEXTAUTH_SECRET="um-segredo-forte-para-producao"
```

`DATABASE_URL` recebe a URL pooled do Neon, normalmente com `-pooler` no host. `DIRECT_URL` recebe a URL direta do Neon, sem `-pooler`, e e usada pelo Prisma para migrations. `AUTH_SECRET` e `NEXTAUTH_SECRET` recebem uma chave secreta; nunca coloque a URL do banco em `NEXTAUTH_SECRET`.

Antes do primeiro deploy, aplique as migrations com `npm run db:deploy` e rode o seed com `npm run db:seed` quando precisar recriar os usuarios iniciais. O build executa `prisma generate` e `next build`.
