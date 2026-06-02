# Levantamento técnico - evolução multifilial

## Objetivo

Registrar o estado técnico da transição do Gasparzinho para a plataforma **Gas**, com foco em isolamento por filial, segurança operacional e redução de risco antes de tornar `branchId` obrigatório.

## Estado atual

- Existe organização padrão `org_gas_default`.
- Existe filial padrão `branch_gasparzinho_default`.
- Cabeçalho, menu lateral e mobile exibem filial ativa.
- Administrador geral pode selecionar filial ativa ou visão consolidada.
- Usuários carregam `organizationId` e `branchId` na sessão.
- Modelos operacionais possuem `branchId` opcional.
- Dados antigos são preenchidos com filial padrão por migração segura.
- Clientes, produtos e veículos usam unicidade por filial.
- Exportações, backups, relatórios, fechamento e módulos operacionais aplicam escopo por filial.
- `npm run branches:audit` separa acessos operacionais com escopo de acessos globais/administrativos.
- `npm run branches:schema-audit` confirma presença de `branchId` nos modelos operacionais.

## Escopo por área

| Área | Estado atual | Observação |
| --- | --- | --- |
| Usuários/equipe | Organização + filial opcional | Login usa e-mail global; perfil define permissão. |
| Clientes | Filial | Telefone é único dentro da filial. |
| Produtos/estoque | Filial | Nome do produto é único dentro da filial. |
| Vendas/pedidos | Filial | Pedido herda filial do usuário ou filial ativa. |
| Entregas | Filial | Entregador vê escopo permitido pelo perfil. |
| Cobranças/dívidas | Filial | Dívida acompanha filial do pedido/cliente. |
| Gastos/despesas | Filial | Alimenta financeiro e relatórios por filial. |
| Frota | Filial | Placa é única dentro da filial. |
| Fechamento | Filial | Fechamento pode ser consolidado por administrador geral. |
| Configurações | Global por enquanto | Mensagens e preferências ainda podem evoluir para escopo por filial. |
| Backup/exportações | Filial ou consolidado | Depende da filial ativa e do perfil. |

## Pontos globais preservados

- `User.email` continua global para evitar login duplicado.
- `SystemSetting` continua global nesta fase.
- `Organization` e `Branch` são administrativos.
- Compatibilidades legadas de rota, como `/dashboard/recompra`, redirecionam para o módulo atual.

## Riscos controlados

- `branchId` ainda é opcional para evitar quebra em dados antigos.
- O fallback sem sessão fica restrito à filial padrão.
- O seletor de filial valida organização e status antes de aplicar cookie.
- Migração de unicidade consolida duplicados exatos antes de criar índices.
- Auditorias locais validam schema e presença de escopo, mas auditoria de dados reais depende de acesso ao banco.

## Próximos pontos técnicos

1. Rodar `npm run branches:data-audit` no ambiente com acesso ao banco de produção.
2. Validar em produção usuários ADMIN, VENDEDOR e ENTREGADOR.
3. Testar criação de uma segunda filial real com poucos dados controlados.
4. Confirmar que exportações e backups isolam corretamente a filial ativa.
5. Só depois avaliar `branchId` obrigatório.
