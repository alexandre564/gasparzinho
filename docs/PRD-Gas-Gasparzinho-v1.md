# PRD - Gas Gasparzinho v1

## Objetivo

Construir e evoluir o Gas Gasparzinho como painel operacional unico para revenda de gas e agua, usando uma unica fonte de dados em PostgreSQL. O sistema deve apoiar vendas, entregas, clientes, estoque, cobranca, financeiro, frota, fidelizacao, fechamento do dia, configuracoes e operacao multifilial controlada.

## Decisao de evolucao

O projeto atual publicado no GitHub e a base v1. As melhorias devem preservar o que ja funciona, evitar reescrita desnecessaria e evoluir por auditoria, validacao e correcoes seguras.

## Prioridades atuais

1. Estabilidade: login, Neon, build, deploy e rotas principais sem erro.
2. Operacao: clientes, vendas, estoque, entregas e cobranca funcionando de ponta a ponta.
3. Dados reais: auditoria e reparo de dados com simulacao antes de aplicacao.
4. Multifilial: filial padrao, filial norte de teste, perfis e isolamento.
5. Financeiro: entradas, saidas, dividas, despesas, gastos e fechamento confiaveis.
6. Fidelizacao: previsao baseada no historico real de compras.
7. Usabilidade: telas claras, responsivas e com acoes evidentes.

## Modulos

### Pagina principal

- KPIs de vendas, clientes, dividas, estoque critico, entregas e fidelizacao.
- Grafico de vendas.
- Pedidos recentes.
- Escopo por filial para dados operacionais.

### Clientes

- Cadastro com nome, telefone, CEP, rua, numero, bairro, cidade e referencia.
- Numero sempre manual.
- Cidade padrao Lavras, mas editavel.
- Busca por nome e telefone.
- Importacao/exportacao.
- Acao para iniciar pedido.
- Validacao reforcada para novos cadastros com entrega.

### Vendas

- Pedido com cliente, itens, quantidade, preco, custo, pagamento e data prevista.
- Criacao automatica de entrega.
- Criacao automatica de divida quando for fiado.
- Atualizacao de estoque e movimentacao.
- Endereco efetivo de entrega registrado no pedido.
- Bloqueio de venda com entrega sem endereco utilizavel.

### Entregas

- Estados: pedido feito, enviado ao entregador, entregue pago, entregue a receber.
- WhatsApp, Maps/Waze e destaque para entregas sem endereco.
- Confirmacao de pagamento ou conta a receber.

### Cobranca

- Lista de dividas pendentes, vencidas, renegociadas e pagas.
- Vencimento, renegociacao, nova data prevista, pagamento e dias em atraso.
- Texto de WhatsApp configuravel.
- Importacao/exportacao e destaque para vencidos.

### Financeiro e gastos

- Despesas operacionais e gastos por categoria.
- Dividas e valores em aberto.
- KPIs por periodo.
- Integracao com vendas, cobrancas e fechamento.

### Estoque

- Produtos com preco de venda, custo e saldo.
- Alerta de estoque critico.
- Movimentacoes por venda, cancelamento e ajustes.

### Frota

- Cadastro de veiculos, status e custo medio.
- Evolucao futura: logs detalhados de manutencao e custos.

### Fidelizacao

- Previsao por intervalo medio individual entre compras.
- Acao para iniciar venda com cliente selecionado.

### Filiais

- Cadastro e edicao de filiais.
- Status operacional e contratual.
- Seletor de filial para administrador.
- Vendedor e entregador restritos a filial vinculada.
- Auditorias e E2E especificos para isolamento.

### Fechamento do dia

- Somar vendas, despesas e saldo liquido.
- Historico de fechamento.
- Resumo para WhatsApp.
- Evolucao futura: PDF.

## Regras de negocio

- O banco unico e PostgreSQL Neon.
- O schema padrao da aplicacao e `gasparzinho_v2_dev`.
- Vendas fiadas geram divida.
- Entrega paga quita ou atualiza cobranca vinculada.
- Entrega a receber mantem ou cria divida.
- Dados operacionais respeitam filial ativa.
- Administrador pode operar visao consolidada; vendedores e entregadores nao.
- Dados sensiveis nao devem ir para GitHub.

## Criterios de aceite globais

- `npm run build` deve passar antes de publicar.
- `npm run flows:audit`, `branches:audit` e `branches:schema-audit` devem passar.
- `npm run e2e:smoke` e `e2e:critical` devem passar com servidor local.
- `npm run e2e:multifilial` deve passar quando o ambiente tiver banco acessivel e filial norte seedada.
- Login admin deve funcionar com usuario ativo no banco.
- Rotas principais devem abrir sem erro.
- Nenhum modulo deve depender de dados mockados quando houver tabela real.
- Tabelas devem ter contraste suficiente e leitura boa em desktop e celular.

## Backlog proximo

1. Rodar `e2e:multifilial` no ambiente com acesso ao Neon.
2. Homologar perfis ADMIN, VENDEDOR e ENTREGADOR em producao.
3. Confirmar relatorios consolidados apenas para administrador geral.
4. Usar o sistema por alguns dias com duas filiais antes de tornar `branchId` obrigatorio.
5. Evoluir configuracoes por filial quando a operacao multifilial estiver comprovada.
