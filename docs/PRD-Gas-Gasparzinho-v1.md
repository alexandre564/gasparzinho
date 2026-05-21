# PRD - Gás Gasparzinho v1

## Objetivo
Construir e evoluir o Gás Gasparzinho como painel operacional único para revenda de gás e água, usando uma única fonte de dados em PostgreSQL. O sistema deve apoiar vendas, entregas, clientes, estoque, cobrança, financeiro, frota, recompra, fechamento do dia e configurações, com interface moderna, responsiva e segura.

## Decisão de evolução
Este projeto não será recomeçado do zero. A versão atual publicada no GitHub é a base v1. As melhorias serão aplicadas por etapas, mantendo o banco único, corrigindo divergências estruturais e evitando reescrever módulos que já funcionam.

## Prioridades
1. Estabilidade: login, conexão com Neon, build, deploy e rotas principais sem erro.
2. Modelo de dados: Prisma, banco real e migrations sempre alinhados.
3. Fluxo operacional: clientes, vendas, estoque, entregas e cobrança funcionando de ponta a ponta.
4. Visual: interface menos branca, tabelas com contraste, dashboard vivo e navegação responsiva.
5. Financeiro: entradas, saídas, dívidas, despesas e fechamento do dia confiáveis.
6. Recompra: previsão baseada no histórico real de compras.
7. Permissões: ADMIN, VENDEDOR e ENTREGADOR com acesso coerente.

## Módulos

### Dashboard
- KPIs de vendas, clientes, dívidas, estoque crítico e entregas.
- Gráfico de vendas ou financeiro.
- Pedidos recentes.
- Oportunidades de recompra nos próximos dias.

### Clientes
- Cadastro completo com nome, telefone, CEP, rua, número, bairro, cidade e referência.
- Número sempre manual.
- Cidade padrão Lavras, mas editável.
- Busca por nome e telefone.
- Importação e exportação de clientes.
- Dívida destacada visualmente.
- Ação para iniciar pedido a partir do cliente.

### Vendas
- Pedido com cliente, itens, quantidade, preço, custo, pagamento e data prevista de pagamento.
- Cálculo de valor bruto, custo e lucro.
- Criação automática de entrega quando aplicável.
- Criação automática de dívida quando for fiado.
- Atualização de estoque e movimentação.

### Entregas
- Estados: pedido feito, enviado ao entregador, entregue pago, entregue a receber.
- Mensagens de WhatsApp para cliente e entregador.
- Ao confirmar entrega, registrar pagamento ou conta a receber.

### Estoque
- Produtos com preço de venda, custo e saldo.
- Alerta de estoque crítico.
- Movimentações por venda, cancelamento e ajustes.
- Evolução futura: controle cheio/vazio para botijões.

### Cobrança
- Lista de dívidas pendentes, vencidas e renegociadas.
- Vencimento, data original, renegociação, nova data prevista e pagamento.
- Texto de WhatsApp configurável com variáveis `{cliente}`, `{valor}` e `{vencimento}`.
- Marcar pagamento com data.

### Financeiro
- Despesas operacionais.
- Dívidas e valores em aberto.
- KPIs por dia, semana e mês.
- Evolução futura: gráfico de entradas e saídas.

### Frota
- Cadastro de veículos, status e custo médio.
- Evolução futura: logs de manutenção e custos.

### Recompra
- Previsão por intervalo médio individual entre compras.
- Ação para iniciar venda com cliente já selecionado.

### Fechamento do dia
- Somar vendas e despesas.
- Saldo líquido.
- Histórico de fechamento.
- Resumo para WhatsApp.
- Evolução futura: PDF.

### Configurações
- Produtos e preços.
- Despesas e custos operacionais.
- Texto de cobrança.
- Backup do sistema.

## Regras de negócio
- O banco único é o PostgreSQL Neon.
- O schema padrão da aplicação é `gasparzinho_v2_dev`.
- Vendas fiadas geram dívida.
- Entrega paga quita dívida vinculada.
- Entrega a receber mantém ou cria dívida.
- O texto de cobrança deve ser cordial e editável.
- Dados sensíveis não devem ir para GitHub.

## Critérios de aceite globais
- `npm run build` deve passar antes de publicar.
- Login admin deve funcionar com usuário ativo no banco.
- `/dashboard`, `/dashboard/clientes`, `/dashboard/vendas`, `/dashboard/entregas`, `/dashboard/cobranca`, `/dashboard/configuracoes` e `/dashboard/financeiro/dividas` devem abrir sem erro.
- Nenhum módulo deve depender de dados mockados quando já houver tabela real.
- Links internos devem usar parâmetros existentes, como `customerId` para novo pedido.
- Tabelas devem ter contraste suficiente e leitura boa em desktop e celular.

## Backlog próximo
1. Conferir variáveis da Vercel e garantir `schema=gasparzinho_v2_dev`.
2. Validar login em produção.
3. Revisar responsividade mobile de clientes, vendas e entregas.
4. Melhorar dashboard financeiro com entradas, saídas e saldo.
5. Adicionar logs de frota.
6. Refinar recompra e exibir oportunidades no dashboard.
7. Implementar PDF do fechamento.
8. Limpar arquivos antigos e duplicidades remanescentes com segurança.
