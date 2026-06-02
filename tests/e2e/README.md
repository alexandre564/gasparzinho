# Base E2E do Gasparzinho

Esta pasta registra a base de validacao ponta a ponta do sistema.

## Scripts disponiveis

- `npm run e2e:smoke`: valida um servidor ja aberto, por padrao em `http://localhost:3004`.
- `npm run e2e:critical`: valida rotas essenciais com servidor ativo e confere contratos de venda fiado, entrega, cobranca, filial e backup.
- `npm run e2e:multifilial`: valida login, perfis e isolamento entre filial padrao e filial norte com banco real acessivel.
- `npm run flows:audit`: confere contratos minimos dos fluxos criticos por analise estatica.

## Como rodar o smoke local

1. Abra o sistema local na porta 3004.
2. Rode:

```powershell
npm run e2e:smoke
npm run e2e:critical
npm run e2e:multifilial
```

Para validar outro endereco:

```powershell
$env:E2E_BASE_URL="https://gasparzinho-o4fo.vercel.app"
npm run e2e:smoke
```

O smoke cobre a abertura ou redirecionamento das telas de login, clientes, novo cliente com CEP, nova venda, entregas, cobranca, gastos, financeiro, relatorios e filiais. Tambem confere se APIs sensiveis de sugestao, backup e exportacao bloqueiam acesso sem sessao.

Se o servidor estiver fora do ar, o script falha com diagnostico da base URL, porta esperada e exemplos para iniciar o servidor ou trocar `E2E_BASE_URL`.

O teste critico cobre os fluxos mais caros para regressao:

- venda fiado gerando cobranca;
- pedido com entrega e endereco efetivo;
- cliente com endereco incompleto exigindo correcao;
- cobranca vencida visivel e acionavel;
- troca de filial preservando escopo;
- backup/exportacao protegidos.

## Teste comportamental multifilial

Antes de rodar, confirme que a filial norte foi aplicada:

```powershell
npm run branches:seed-test:apply
```

Depois, com o servidor ativo, rode:

```powershell
npm run e2e:multifilial
```

O teste usa, por padrao, `admin@gasparzinho.com`, `vendedor-norte@gasparzinho.com` e `entregador-norte@gasparzinho.com`. Se precisar trocar credenciais sem alterar codigo, use `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`, `E2E_NORTH_SELLER_EMAIL`, `E2E_NORTH_SELLER_PASSWORD`, `E2E_NORTH_DRIVER_EMAIL` e `E2E_NORTH_DRIVER_PASSWORD`.

Regras de permissao validadas no multifilial:

- ADMIN acessa cobranca, financeiro, gastos, relatorios, equipe, filiais, frota, fechamento, configuracoes, backup e exportacoes sensiveis.
- VENDEDOR acessa clientes, vendas, estoque e fidelizacao, mas nao acessa cobranca, entregas, financeiro, gastos, relatorios, equipe, filiais, frota, fechamento, configuracoes ou APIs administrativas por URL direta.
- ENTREGADOR acessa entregas, mas nao acessa clientes, vendas, cobranca, financeiro, gastos, relatorios, equipe, filiais, frota, fechamento, configuracoes ou APIs administrativas por URL direta.

## Fluxos que devem ganhar automacao completa

- Login com usuario real de teste.
- Criar cliente.
- Criar venda paga.
- Criar venda fiado e conferir cobranca.
- Confirmar entrega paga.
- Confirmar entrega a receber.
- Registrar gasto e conferir financeiro.
- Baixar backup JSON e planilha.

O smoke atual nao cria dados. Ele existe para validar disponibilidade, protecao de rotas sensiveis e base de evolucao sem depender de biblioteca externa.
