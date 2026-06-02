# Homologacao de producao

## Estado da rodada

Data: 2026-06-02

Versao base: branch `main`, ambiente Vercel `https://gasparzinho-o4fo.vercel.app`.

Resultado informado no PowerShell local: os comandos de E2E e auditoria de dados passaram em ambiente com acesso ao Vercel e ao Neon.

Resultados operacionais informados nesta fase:

- `e2e:multifilial` passou na Vercel.
- Perfis ADMIN, VENDEDOR e ENTREGADOR respeitam rotas e APIs sensiveis.
- Bloqueio por URL direta foi confirmado.
- Isolamento transacional por filial foi confirmado.
- `data:diagnose` confirmou conexao no schema `gasparzinho_v2_dev`.
- `branches:data-audit` confirmou 0 registros operacionais sem filial.
- `data:audit` apontou 1593 clientes sem endereco completo para entrega.
- `data:audit` apontou 2 pedidos sem endereco de entrega registrado.

## Comandos automatizados de homologacao

Execute na raiz do projeto:

```powershell
cd "C:\Users\User\Documents\New project\gasparzinho-v2-work"

$env:E2E_BASE_URL="https://gasparzinho-o4fo.vercel.app"
npm run e2e:smoke
npm run e2e:critical
npm run e2e:multifilial

npm run data:diagnose
npm run data:audit
npm run branches:data-audit
```

Esses comandos validam:

- disponibilidade basica da aplicacao publicada;
- redirecionamento e protecao de rotas sem sessao;
- bloqueio de APIs sensiveis sem sessao;
- contratos criticos de venda, cobranca, filiais e backup;
- login e permissoes ADMIN, VENDEDOR e ENTREGADOR no teste multifilial;
- existencia da filial padrao e da filial norte de teste;
- isolamento transacional entre filial padrao e filial norte;
- consistencia operacional do banco real.

## Checklist manual de uso diario

Marcar durante uso real no navegador:

- [ ] Login ADMIN abre a pagina principal sem erro.
- [ ] Login VENDEDOR acessa clientes, vendas, estoque e fidelizacao.
- [ ] Login VENDEDOR nao acessa cobranca, financeiro, gastos, relatorios, filiais, frota, fechamento, equipe ou configuracoes por URL direta.
- [ ] Login ENTREGADOR acessa pagina principal e entregas.
- [ ] Cliente novo com endereco completo salva corretamente.
- [ ] Busca de cliente por nome e telefone funciona.
- [ ] Venda paga cria pedido e entrega.
- [ ] Venda fiada cria cobranca automaticamente.
- [ ] Entrega exibe endereco correto, Maps/Waze e acoes de WhatsApp.
- [ ] Confirmar entrega atualiza pagamento ou mantem valor a receber.
- [ ] Cobranca mostra pendentes, vencidas, renegociadas e pagas no historico.
- [ ] Renegociacao mantem saldo restante quando houver pagamento parcial.
- [ ] Financeiro reflete vendas, gastos, dividas e filtros de periodo.
- [ ] Fechamento mostra entradas, despesas, saldo, estoque e historico.
- [ ] Backup completo baixa arquivo utilizavel.
- [ ] Backup planilha baixa arquivo utilizavel para conferencia diaria.
- [ ] Filial padrao e filial norte nao misturam clientes, vendas, entregas, cobrancas, estoque, gastos ou relatorios.

## Saneamento operacional

Antes de importacoes grandes ou fechamento mensal, rode:

```powershell
npm run data:audit
npm run branches:data-audit
```

Se a auditoria apontar dados saneaveis:

```powershell
npm run data:repair
```

Somente depois de revisar a simulacao:

```powershell
npm run data:repair:apply
```

Politica desta fase:

- pedidos sem endereco de entrega podem ser reparados automaticamente apenas se o cliente ja tiver rua, numero, bairro e cidade;
- clientes legados sem endereco completo devem continuar no historico e receber complemento quando voltarem a comprar;
- nomes/campos com codificacao quebrada podem ser normalizados automaticamente;
- duplicados por telefone devem ser revisados antes de qualquer mesclagem, porque podem representar historico real de importacao.

## Criterio para avancar para Plataforma Gas

Avancar para a camada superior da plataforma Gas somente depois de:

- comandos automatizados continuarem passando em producao;
- checklist manual de uso diario nao apontar erro critico;
- backup e exportacoes estarem conferidos;
- usuarios reais confirmarem isolamento entre filial padrao e filial norte;
- dados legados mais problemáticos estarem saneados ou claramente sinalizados.
