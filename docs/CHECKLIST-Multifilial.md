# Checklist de execução multifilial

Este checklist controla a transição do Gasparzinho para a plataforma **Gas** sem quebrar a operação atual.

## Estado seguro atual

- [x] O sistema atual continua usando os dados existentes sem filtro por filial.
- [x] A filial padrão aparece no cabeçalho, no menu lateral e nas configurações.
- [x] Os modelos `Organization` e `Branch` foram preparados no Prisma.
- [x] O `db:safe-sync` cria a base multifilial quando as variáveis do banco existem.
- [x] O build da Vercel não falha quando o ambiente não expõe `DATABASE_URL` ou `DIRECT_URL` para o passo de sincronização.
- [x] O seed da filial padrão está disponível em `npm run branches:seed-default`.
- [x] A auditoria de consultas Prisma está disponível em `npm run branches:audit`.
- [x] A auditoria de schema está disponível em `npm run branches:schema-audit`.
- [x] A auditoria de dados por filial está disponível em `npm run branches:data-audit`.
- [x] O backup JSON e o backup em planilha já incluem organização e filiais quando essas tabelas existem.
- [x] A tela de Filiais já tenta ler as filiais reais do banco sem quebrar quando a base ainda não foi criada.
- [x] O seed da filial padrão também cria a base `Organization`/`Branch` se ela ainda não existir.
- [x] `branchId` opcional foi preparado nos modelos operacionais.
- [x] `organizationId` e `branchId` foram preparados no usuário.
- [x] A migração segura preenche dados atuais com a filial padrão.
- [x] Os scripts de inicialização rodam sincronização segura antes de abrir o sistema local.

## Confirmações de produção

- [ ] Confirmar que `Organization` e `Branch` existem no banco de produção, pela tela de Filiais ou pelo seed.
- [ ] Executar `npm run branches:seed-default` com acesso ao banco correto, caso a filial padrão ainda não apareça.
- [ ] Confirmar que a filial padrão criada é `branch_gasparzinho_default`.
- [ ] Confirmar com `npm run branches:data-audit` que não há registros antigos sem filial.
- [ ] Definir se telefone de cliente será único por filial ou único no sistema inteiro.
- [ ] Definir se produto e estoque serão separados por filial desde o início.
- [ ] Definir se frota será exclusiva por filial ou compartilhada.
- [ ] Definir se mensagens de cobrança, WhatsApp e preços serão globais ou por filial.

## Migração operacional planejada

- [x] Adicionar `branchId` opcional em usuários.
- [x] Adicionar `branchId` opcional em clientes, produtos, estoque, pedidos, entregas, dívidas, gastos, frota e fechamento.
- [x] Preencher dados existentes com `branch_gasparzinho_default`.
- [x] Criar índices por `branchId`.
- [x] Atualizar sessão para carregar filial ativa.
- [x] Aplicar helpers de escopo por filial nos módulos operacionais.
- [x] Bloquear acesso direto por URL quando o usuário não pertencer à filial nos fluxos já escopados.
- [x] Aplicar escopo por filial em exportações, backup, relatórios e fechamento.
- [x] Criar seleção de filial ativa para administrador geral.
- [ ] Só depois tornar `branchId` obrigatório onde fizer sentido.

## Validação obrigatória após migração

- [ ] Login de administrador geral.
- [ ] Login de administrador da filial.
- [ ] Login de vendedor.
- [ ] Login de entregador.
- [x] Clientes isolados por filial.
- [x] Venda gerando entrega, financeiro e cobrança na filial correta.
- [x] Backup/exportações respeitando filial ativa.
- [x] Relatórios consolidados apenas para administrador geral.
