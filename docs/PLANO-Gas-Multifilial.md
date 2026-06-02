# Plano - Gas multifilial

## Objetivo

Evoluir o Gasparzinho para uma plataforma chamada **Gas**, onde o Gas Gasparzinho passa a ser uma filial administrada dentro de uma operacao maior. A meta e permitir novas filiais proprias, unidades por regiao e eventual cessao de uso para outras revendas, sem misturar dados operacionais entre filiais.

## Principio de seguranca

A evolucao multifilial continua incremental. O Gasparzinho permanece como filial padrao enquanto a plataforma ganha isolamento, filtros, permissoes e auditorias por filial.

## Modelo

- Organizacao: representa o grupo, dono da plataforma ou contrato principal.
- Filial: representa cada revenda/unidade, como "Gas Gasparzinho", "Gas Gasparzinho Zona Norte" ou uma revenda licenciada.
- Usuario: pertence a uma organizacao e pode estar vinculado a uma filial especifica.
- Permissoes: administrador geral pode alternar entre visao consolidada e filial ativa; vendedores e entregadores ficam presos a filial vinculada.
- Dados operacionais: clientes, produtos, estoque, pedidos, entregas, dividas, gastos, frota e fechamentos possuem vinculo com filial.

## Fases e status

### Fase 1 - Preparacao sem risco

- [x] Documentar filial padrao.
- [x] Criar configuracao `defaultBranchName`.
- [x] Exibir filial ativa no cabecalho e menu lateral.
- [x] Criar modulo administrativo "Filiais".
- [x] Mapear modelos com necessidade de `branchId`.
- [x] Criar auditorias `branches:audit`, `branches:schema-audit` e `branches:data-audit`.
- [x] Criar helper de escopo em `src/lib/branch-scope.ts`.

### Fase 2 - Banco multifilial

- [x] Criar modelos `Organization` e `Branch`.
- [x] Preparar migrations seguras para criacao das tabelas.
- [x] Preparar seed da organizacao `Gas` e filial `branch_gasparzinho_default`.
- [x] Incluir organizacao e filiais nos backups.
- [x] Adicionar `branchId` opcional aos modelos operacionais.
- [x] Preencher dados antigos com filial padrao.
- [x] Criar indices por filial.
- [x] Trocar unicidade global de cliente, produto e veiculo por unicidade por filial.

### Fase 3 - Permissoes e sessao

- [x] Adicionar `organizationId` e `branchId` ao usuario.
- [x] Incluir organizacao e filial na sessao.
- [x] Aplicar escopo por filial em consultas, acoes, exportacoes, backup, relatorios e fechamento.
- [x] Criar seletor de filial para administradores gerais.
- [x] Validar filial ativa antes de aplicar cookie de selecao.
- [x] Restringir fallback sem sessao a filial padrao, evitando visao global acidental.

### Fase 4 - Interface administrativa

- [x] Criar modulo "Filiais".
- [x] Exibir filial ativa no cabecalho, sidebar e mobile.
- [x] Permitir cadastrar, editar, ativar, pausar e acompanhar unidades.
- [x] Permitir relatorios consolidados para administrador geral e isolados por filial quando uma filial estiver ativa.

### Fase 5 - Comercializacao/licenciamento

- [x] Adicionar status contratual da filial.
- [x] Preparar campos de plano, vencimento, responsavel, contato e observacoes.
- [x] Criar acompanhamento inicial de filiais sem expor dados operacionais de outra filial.

### Fase 6 - Validacao operacional

- [x] Criar `data:diagnose`, `data:audit`, `branches:data-audit` e `data:repair`.
- [x] Criar `branches:seed-test` e `branches:seed-test:apply` para segunda filial.
- [x] Criar `e2e:smoke` e `e2e:critical`.
- [x] Criar `e2e:multifilial` para login, perfis, URL direta, APIs e isolamento transacional.
- [ ] Rodar `e2e:multifilial` no mesmo ambiente em que `data:diagnose` acessa o Neon.
- [ ] Validar em producao que relatorios consolidados somam filiais apenas para administrador geral.

## Criterios de aceite

- [x] O Gasparzinho atual continua funcionando como filial padrao.
- [x] Importacao, exportacao e backup respeitam filial ativa.
- [x] Fechamento do dia fica vinculado a filial.
- [x] Auditoria estatica confirma que acessos operacionais Prisma usam escopo por filial.
- [x] Auditoria de schema confirma `branchId` nos modelos operacionais.
- [x] Fluxos criticos possuem contratos de validacao automatizada.
- [ ] Validacao comportamental multifilial executada em ambiente com banco acessivel.

## Proximo passo seguro

Rodar `data:audit`, `branches:data-audit` e `e2e:multifilial` no ambiente com acesso ao Neon. Usar o sistema em producao com dados reais por alguns dias e, somente depois, avaliar se `branchId` deve se tornar obrigatorio nos modelos operacionais.
