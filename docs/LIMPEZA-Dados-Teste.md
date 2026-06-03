# Limpeza conservadora de dados de teste

Esta rotina existe para planejar a remocao de dados artificiais sem apagar clientes.

## Regra principal

Nunca remover automaticamente:

- `Customer`
- `User`
- `Branch`
- `Organization`
- `Product`
- `SystemSetting`

Clientes, usuarios, filiais, produtos e configuracoes sao preservados mesmo quando parecem vir de importacao, seed ou teste.

## Simulacao

Execute primeiro:

```powershell
cd "C:\Users\User\Documents\New project\gasparzinho-v2-work"
npm run data:test-cleanup
```

O comando mostra:

- contagem atual das tabelas protegidas;
- contagem atual das tabelas operacionais;
- filiais consideradas de teste;
- candidatos seguros para remocao;
- registros preservados para revisao manual;
- impacto em cascata ao remover pedidos.

## Criterios aceitos como candidatos seguros

- registro operacional vinculado a filial explicitamente de teste, como `branch_gasparzinho_teste_norte`;
- registro operacional cujo texto contenha marcador claro: `teste`, `test`, `e2e`, `demo`, `seed` ou `homologacao`;
- pedido demo identificado exatamente pelo `prisma/seed.ts`, como os pedidos dos clientes de seed `Maria Aparecida` e `Joao Pereira` com telefones ficticios;
- ID informado manualmente em variavel de ambiente especifica.

## Criterios que ficam em revisao manual

- pedido da filial padrao sem marcador confiavel;
- gasto generico, mesmo que pareca criado em seed;
- veiculo generico, mesmo que pareca criado em seed;
- movimentacao de estoque sem filial de teste ou ID explicitamente informado;
- qualquer registro que pareca estranho, mas nao possua marcador seguro.

Em caso de duvida, preservar.

## Informar IDs confirmados manualmente

Se apos revisar a simulacao voce decidir marcar registros especificos como teste, use variaveis de ambiente:

```powershell
$env:TEST_CLEANUP_ORDER_IDS="id_pedido_1,id_pedido_2"
$env:TEST_CLEANUP_EXPENSE_IDS="id_gasto_1"
$env:TEST_CLEANUP_DAILY_CLOSING_IDS="id_fechamento_1"
$env:TEST_CLEANUP_INVENTORY_MOVEMENT_IDS="id_movimento_1"
$env:TEST_CLEANUP_BUTANE_CYLINDER_IDS="id_botijao_1"
$env:TEST_CLEANUP_VEHICLE_IDS="id_veiculo_1"
npm run data:test-cleanup
```

## Aplicacao

Aplicar somente depois de revisar a lista:

```powershell
npm run data:test-cleanup:apply
```

A aplicacao e protegida por transacao. Se a contagem de qualquer tabela protegida mudar, a rotina cancela e desfaz a operacao.

## Validacao apos aplicar

Depois de qualquer aplicacao real:

```powershell
npm run data:audit
npm run branches:data-audit
npm run e2e:smoke
npm run e2e:critical
```
