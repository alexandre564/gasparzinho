# Levantamento técnico - evolução multifilial

## Objetivo

Este levantamento prepara a evolução do Gasparzinho para a plataforma **Gas**, sem alterar ainda o isolamento de dados em produção. A regra desta etapa é mapear escopos, pontos de acesso ao banco e riscos antes de adicionar `branchId` aos modelos operacionais.

## Estado seguro já iniciado

- Existe uma filial padrão configurável por `SystemSetting.defaultBranchName`.
- A filial padrão aparece no cabeçalho e no menu lateral.
- A tela de Configurações permite alterar o nome da filial ativa sem migração de banco.
- O menu administrativo possui a área "Filiais" para acompanhar a preparação multifilial.
- O Prisma já possui os modelos isolados `Organization` e `Branch`, sem vínculo obrigatório com os dados atuais.
- A migração `20260601093000_add_multibranch_foundation` e o `db:safe-sync` já estão preparados para criar as tabelas.
- O comando `npm run branches:seed-default` prepara a organização `Gas` e a filial `Gás Gasparzinho`.
- O seed cria a filial padrão lógica como "Gás Gasparzinho".
- Nenhuma consulta operacional foi filtrada por filial ainda, evitando regressão nos módulos já funcionando.

## Classificação de escopo atual

| Área | Escopo atual | Escopo futuro | Observação |
| --- | --- | --- | --- |
| Usuários/equipe | Global do sistema | Organização + filial opcional | Administrador geral poderá ver tudo; perfis operacionais devem ficar presos à filial. |
| Clientes | Global | Filial | Cada filial deve ter sua própria base de clientes, com prevenção de duplicidade por telefone dentro da filial. |
| Produtos/estoque | Global | Filial | Preços e saldos podem variar por filial. |
| Vendas/pedidos | Global | Filial | Pedido deve herdar a filial do vendedor ou da filial ativa. |
| Entregas | Global | Filial | Entregador deve enxergar apenas entregas da filial vinculada. |
| Cobranças/dívidas | Global | Filial | Histórico de fiado deve acompanhar a filial do pedido. |
| Gastos/despesas | Global | Filial | Gastos alimentam financeiro e fechamento por filial. |
| Frota | Global | Filial ou compartilhada | Veículos podem ser exclusivos de uma filial ou compartilhados em fase posterior. |
| Fechamento do dia | Global por data | Filial + consolidado | Fechamento precisa ser único por filial/data e consolidável para administrador geral. |
| Configurações | Global | Organização + filial | Mensagens, WhatsApp e preços podem ter configuração global ou sobrescrita por filial. |
| Backup/exportações | Global | Filial ou consolidado | Administrador geral exporta tudo; filial exporta apenas seus dados. |

## Pontos de acesso ao banco que precisarão de revisão

O comando `npm run branches:audit` lista os arquivos que acessam Prisma e ajuda a manter este levantamento atualizado antes da migração real.

### Consultas por filial obrigatória

- `src/app/dashboard/clientes/**`
- `src/app/dashboard/vendas/**`
- `src/app/dashboard/entregas/**`
- `src/app/dashboard/cobranca/**`
- `src/app/dashboard/estoque/**`
- `src/app/dashboard/financeiro/**`
- `src/app/dashboard/fechamento/**`
- `src/app/dashboard/fidelizacao/**`
- `src/app/dashboard/frota/**`
- `src/app/api/clientes/**`
- `src/app/api/vendas/**`
- `src/app/api/entregas/**`
- `src/app/api/cobranca/**`
- `src/app/api/estoque/**`
- `src/app/api/financeiro/**`
- `src/app/api/fechamento/**`
- `src/app/api/fidelizacao/**`
- `src/app/api/frota/**`

### Consultas globais ou administrativas

- `src/app/dashboard/configuracoes/**`
- `src/app/dashboard/equipe/**`
- `src/app/api/equipe/**`
- `src/app/api/backup/**`
- `src/lib/permissions.ts`
- `src/auth.ts`

## Sequência técnica recomendada

1. Criar modelos `Organization` e `Branch`. Concluído no schema.
2. Criar uma organização e uma filial padrão para os dados atuais. Script preparado; execução no banco ainda pendente.
3. Adicionar `organizationId` e `branchId` opcionais aos usuários.
4. Adicionar `branchId` opcional aos modelos operacionais, ainda sem tornar obrigatório.
5. Rodar script de preenchimento para associar dados antigos à filial padrão.
6. Atualizar sessão para carregar filial ativa.
7. Criar helpers de consulta, por exemplo `getCurrentBranchScope()` e `withBranchWhere()`.
8. Atualizar módulo por módulo, começando por clientes e vendas.
9. Tornar `branchId` obrigatório apenas depois de todos os módulos validarem isolamento.

## Riscos controlados

- Não aplicar filtro por filial antes de preencher dados antigos.
- Não alterar unicidade global de telefone/produto antes de decidir a regra por filial.
- Não misturar administrador geral com administrador de filial na mesma permissão.
- Não permitir backup global para usuário de filial.

## Critério para iniciar migração real

A migração real só deve começar quando houver decisão fechada sobre:

- Se cliente pode existir em mais de uma filial com o mesmo telefone.
- Se estoque será sempre separado por filial.
- Se frota pode ser compartilhada entre filiais.
- Se configurações de cobrança e entrega serão globais ou por filial.
- Quais usuários atuais serão administradores gerais e quais serão administradores da filial Gasparzinho.
