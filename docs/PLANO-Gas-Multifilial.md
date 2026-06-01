# Plano - Gas multifilial

## Objetivo

Evoluir o Gasparzinho para uma plataforma chamada **Gas**, onde o Gás Gasparzinho passa a ser uma filial/tenant administrada dentro de uma operação maior. A meta é permitir novas filiais próprias, unidades por região e eventual cessão de uso para outras revendas, sem misturar dados operacionais entre empresas.

## Princípio de segurança

A evolução multifilial não deve ser aplicada de uma vez no sistema atual. O caminho seguro é preparar a arquitetura por camadas, mantendo o Gasparzinho funcionando como filial padrão até que todos os módulos estejam filtrando dados por filial.

## Modelo futuro

- Organização: representa o grupo, dono da plataforma ou contrato principal.
- Filial: representa cada revenda/unidade, como "Gás Gasparzinho", "Gás Gasparzinho Zona Norte" ou uma revenda licenciada.
- Usuário: deve pertencer a uma organização e, quando aplicável, a uma filial específica.
- Permissões: o administrador geral vê todas as filiais; administradores de filial veem apenas sua unidade; vendedores e entregadores veem apenas a filial vinculada.
- Dados operacionais: clientes, produtos, estoque, pedidos, entregas, dívidas, gastos, frota e fechamentos devem receber vínculo com filial.

## Fases recomendadas e status

### Fase 1 - Preparação sem risco

- [x] Criar o conceito documentado de filial padrão.
- [x] Adicionar configuração `defaultBranchName` em `SystemSetting`.
- [x] Exibir filial ativa no cabeçalho e no menu lateral.
- [x] Criar tela administrativa de acompanhamento em "Filiais".
- [x] Mapear todos os modelos que precisarão de `branchId`.
- [x] Criar auditoria estática com `npm run branches:audit`.
- [x] Não alterar consultas de produção ainda.

### Fase 2 - Banco multifilial

- [x] Preparar modelos isolados `Organization` e `Branch` no Prisma sem conectar aos dados atuais.
- [x] Preparar migração e `db:safe-sync` para criar as tabelas no banco.
- [x] Preparar script `npm run branches:seed-default` para criar a organização e filial padrão reais.
- [ ] Executar a criação das tabelas e filial padrão no banco de produção.
- [ ] Adicionar `branchId` opcional aos modelos operacionais.
- [ ] Preencher `branchId` nos dados existentes com a filial padrão.
- [ ] Adicionar índices por filial para consultas rápidas.

### Fase 3 - Permissões e sessão

- [ ] Adicionar `organizationId` e `branchId` ao usuário.
- [ ] Incluir filial ativa na sessão.
- [ ] Proteger consultas e ações para que cada perfil veja apenas o escopo permitido.
- [ ] Criar seleção de filial apenas para administradores gerais.

### Fase 4 - Interface administrativa

- [x] Criar módulo inicial "Filiais" para acompanhamento da preparação.
- [x] Exibir nome da filial ativa no cabeçalho.
- [ ] Cadastrar, editar, ativar, pausar e configurar unidades reais.
- [ ] Permitir relatórios consolidados para administrador geral e relatórios isolados por filial.

### Fase 5 - Comercialização/licenciamento

- [ ] Adicionar status contratual da filial: teste, ativa, suspensa, cancelada.
- [ ] Preparar campos para plano, vencimento, responsável, contato e observações.
- [ ] Criar telas de acompanhamento de uso sem expor dados de uma filial a outra.

## Critérios de aceite

- O Gasparzinho atual continua funcionando como filial padrão.
- Nenhum usuário de filial consegue acessar dados de outra filial por URL direta.
- Relatórios gerais somam várias filiais apenas para administrador geral.
- Importação, exportação e backup respeitam a filial ativa.
- O fechamento do dia continua fechado por filial e pode ser consolidado no nível geral.

## Próximo passo seguro

Antes de qualquer migração, criar um levantamento técnico com todos os pontos de acesso ao banco e classificar cada consulta como global, por usuário ou por filial. Só depois disso iniciar a migração real.

## Andamento iniciado

- A filial padrão lógica foi iniciada por configuração em `SystemSetting.defaultBranchName`.
- O nome da filial ativa pode ser alterado em Configurações.
- Cabeçalho e menu lateral exibem a filial ativa com fallback seguro para "Gás Gasparzinho".
- O menu administrativo possui a área "Filiais" para acompanhar o preparo sem iniciar migração arriscada.
- O levantamento técnico inicial está registrado em `docs/LEVANTAMENTO-Multifilial.md`.
- A auditoria estática de pontos Prisma pode ser executada com `npm run branches:audit`.
- A migração real para `Organization`, `Branch` e `branchId` segue pendente de decisão de regra de negócio, para não quebrar os dados atuais.
