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

## Antes de adicionar `branchId` nos dados operacionais

- [ ] Confirmar que `Organization` e `Branch` existem no banco de produção.
- [ ] Executar `npm run branches:seed-default` com acesso ao banco correto.
- [ ] Confirmar que a filial padrão criada é `branch_gasparzinho_default`.
- [ ] Definir se telefone de cliente será único por filial ou único no sistema inteiro.
- [ ] Definir se produto e estoque serão separados por filial desde o início.
- [ ] Definir se frota será exclusiva por filial ou compartilhada.
- [ ] Definir se mensagens de cobrança, WhatsApp e preços serão globais ou por filial.

## Migração operacional planejada

- [ ] Adicionar `branchId` opcional em usuários.
- [ ] Adicionar `branchId` opcional em clientes, produtos, estoque, pedidos, entregas, dívidas, gastos, frota e fechamento.
- [ ] Preencher dados existentes com `branch_gasparzinho_default`.
- [ ] Criar índices por `branchId`.
- [ ] Atualizar sessão para carregar filial ativa.
- [ ] Aplicar helpers de escopo por filial nos módulos operacionais.
- [ ] Bloquear acesso direto por URL quando o usuário não pertencer à filial.
- [ ] Só depois tornar `branchId` obrigatório onde fizer sentido.

## Validação obrigatória após migração

- [ ] Login de administrador geral.
- [ ] Login de administrador da filial.
- [ ] Login de vendedor.
- [ ] Login de entregador.
- [ ] Clientes isolados por filial.
- [ ] Venda gerando entrega, financeiro e cobrança na filial correta.
- [ ] Backup/exportações respeitando filial ativa.
- [ ] Relatórios consolidados apenas para administrador geral.
