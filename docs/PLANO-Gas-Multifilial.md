# Plano - Gas multifilial

## Objetivo

Evoluir o Gasparzinho para uma plataforma chamada **Gas**, onde o Gas Gasparzinho passa a ser uma filial administrada dentro de uma operação maior. A meta é permitir novas filiais próprias, unidades por região e eventual cessão de uso para outras revendas, sem misturar dados operacionais entre empresas.

## Princípio de segurança

A evolução multifilial deve continuar incremental. O Gasparzinho permanece funcionando como filial padrão enquanto a plataforma ganha isolamento, filtros, permissões e auditorias por filial.

## Modelo

- Organização: representa o grupo, dono da plataforma ou contrato principal.
- Filial: representa cada revenda/unidade, como "Gas Gasparzinho", "Gas Gasparzinho Zona Norte" ou uma revenda licenciada.
- Usuário: pertence a uma organização e pode estar vinculado a uma filial específica.
- Permissões: administrador geral pode alternar entre visão consolidada e filial ativa; vendedores e entregadores ficam presos à filial vinculada.
- Dados operacionais: clientes, produtos, estoque, pedidos, entregas, dívidas, gastos, frota e fechamentos possuem vínculo com filial.

## Fases e status

### Fase 1 - Preparação sem risco

- [x] Documentar filial padrão.
- [x] Criar configuração `defaultBranchName`.
- [x] Exibir filial ativa no cabeçalho e menu lateral.
- [x] Criar módulo administrativo "Filiais".
- [x] Mapear modelos com necessidade de `branchId`.
- [x] Criar auditorias `branches:audit`, `branches:schema-audit` e `branches:data-audit`.
- [x] Criar helper de escopo em `src/lib/branch-scope.ts`.

### Fase 2 - Banco multifilial

- [x] Criar modelos `Organization` e `Branch`.
- [x] Preparar migrações seguras para criação das tabelas.
- [x] Preparar seed da organização `Gas` e filial `branch_gasparzinho_default`.
- [x] Incluir organização e filiais nos backups.
- [x] Adicionar `branchId` opcional aos modelos operacionais.
- [x] Preencher dados antigos com a filial padrão.
- [x] Criar índices por filial.
- [x] Trocar unicidade global de cliente/produto/veículo por unicidade por filial.

### Fase 3 - Permissões e sessão

- [x] Adicionar `organizationId` e `branchId` ao usuário.
- [x] Incluir organização e filial na sessão.
- [x] Aplicar escopo por filial em consultas, ações, exportações, backup, relatórios e fechamento.
- [x] Criar seletor de filial para administradores gerais.
- [x] Validar filial ativa antes de aplicar cookie de seleção.
- [x] Restringir fallback sem sessão à filial padrão, evitando visão global acidental.

### Fase 4 - Interface administrativa

- [x] Criar módulo inicial "Filiais".
- [x] Exibir filial ativa no cabeçalho, sidebar e mobile.
- [x] Permitir cadastrar, editar, ativar, pausar e acompanhar unidades.
- [x] Permitir relatórios consolidados para administrador geral e isolados por filial quando uma filial estiver ativa.

### Fase 5 - Comercialização/licenciamento

- [x] Adicionar status contratual da filial.
- [x] Preparar campos de plano, vencimento, responsável, contato e observações.
- [x] Criar acompanhamento inicial de filiais sem expor dados operacionais de outra filial.

## Critérios de aceite

- [x] O Gasparzinho atual continua funcionando como filial padrão.
- [x] Importação, exportação e backup respeitam filial ativa.
- [x] Fechamento do dia fica vinculado à filial.
- [x] Auditoria estática confirma que acessos operacionais Prisma usam escopo por filial.
- [ ] Validar em produção, com usuários reais, que nenhum perfil acessa dados de outra filial por URL direta.
- [ ] Validar em produção que relatórios consolidados somam filiais apenas para administrador geral.
- [ ] Validar dados reais com `branches:data-audit` quando o ambiente permitir acesso ao banco.

## Próximo passo seguro

Usar o sistema em produção com dados reais por alguns dias, rodar auditoria de dados por filial no ambiente com acesso ao banco e, somente depois, avaliar se `branchId` deve se tornar obrigatório nos modelos operacionais.
