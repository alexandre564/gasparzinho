# Levantamento tecnico - evolucao multifilial

## Objetivo

Registrar o estado tecnico da transicao do Gasparzinho para a plataforma **Gas**, com foco em isolamento por filial, seguranca operacional e reducao de risco antes de tornar `branchId` obrigatorio.

## Estado atual

- Existe organizacao padrao `org_gas_default`.
- Existe filial padrao `branch_gasparzinho_default`.
- Existe preparo para filial de teste `branch_gasparzinho_teste_norte`.
- Cabecalho, menu lateral e mobile exibem filial ativa.
- Administrador geral pode selecionar filial ativa ou visao consolidada.
- Usuarios carregam `organizationId` e `branchId` na sessao.
- Modelos operacionais possuem `branchId` opcional.
- Dados antigos podem ser preenchidos com filial padrao por migracao segura/reparo operacional.
- Clientes, produtos e veiculos usam unicidade por filial.
- Exportacoes, backups, relatorios, fechamento e modulos operacionais aplicam escopo por filial.
- `npm run branches:audit` separa acessos operacionais com escopo de acessos globais/administrativos.
- `npm run branches:schema-audit` confirma presenca de `branchId` nos modelos operacionais.
- `npm run e2e:multifilial` valida comportamento real quando servidor e banco estao acessiveis.

## Escopo por area

| Area | Estado atual | Observacao |
| --- | --- | --- |
| Usuarios/equipe | Organizacao + filial opcional | Login usa e-mail global; perfil define permissao. |
| Clientes | Filial | Telefone e unico dentro da filial. |
| Produtos/estoque | Filial | Nome do produto e unico dentro da filial. |
| Vendas/pedidos | Filial | Pedido herda filial do usuario ou filial ativa. |
| Entregas | Filial | Entregador ve apenas o escopo permitido pelo perfil. |
| Cobrancas/dividas | Filial | Divida acompanha filial do pedido/cliente. |
| Gastos/despesas | Filial | Alimenta financeiro e relatorios por filial. |
| Frota | Filial | Placa e unica dentro da filial. |
| Fechamento | Filial | Fechamento pode ser consolidado por administrador geral. |
| Configuracoes | Global por enquanto | Mensagens e preferencias ainda podem evoluir para escopo por filial. |
| Backup/exportacoes | Filial ou consolidado | Depende da filial ativa e do perfil. |

## Pontos globais preservados

- `User.email` continua global para evitar login duplicado.
- `SystemSetting` continua global nesta fase.
- `Organization` e `Branch` sao administrativos.
- Compatibilidades legadas de rota, como `/dashboard/recompra`, redirecionam para o modulo atual.

## Riscos controlados

- `branchId` ainda e opcional para evitar quebra em dados antigos.
- O fallback sem sessao fica restrito a filial padrao.
- O seletor de filial valida organizacao e status antes de aplicar cookie.
- Migracao de unicidade consolida duplicados exatos antes de criar indices.
- Auditorias locais validam schema e presenca de escopo.
- Auditoria de dados reais depende de acesso ao Neon, mas os scripts agora exibem diagnostico acionavel.

## Proximos pontos tecnicos

1. Rodar `npm run data:diagnose` no ambiente com acesso ao banco.
2. Rodar `npm run branches:data-audit` depois de reparos operacionais.
3. Rodar `npm run e2e:multifilial` com servidor local e banco acessivel.
4. Validar em producao usuarios ADMIN, VENDEDOR e ENTREGADOR.
5. Confirmar que exportacoes e backups isolam corretamente a filial ativa.
6. So depois avaliar `branchId` obrigatorio.
