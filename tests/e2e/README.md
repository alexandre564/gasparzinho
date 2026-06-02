# Base E2E do Gasparzinho

Esta pasta registra a base de validacao ponta a ponta do sistema.

## Scripts disponiveis

- `npm run e2e:smoke`: valida um servidor ja aberto, por padrao em `http://localhost:3004`.
- `npm run e2e:critical`: valida rotas essenciais com servidor ativo e confere contratos de venda fiado, entrega, cobranca, filial e backup.
- `npm run flows:audit`: confere contratos minimos dos fluxos criticos por analise estatica.

## Como rodar o smoke local

1. Abra o sistema local na porta 3004.
2. Rode:

```powershell
npm run e2e:smoke
npm run e2e:critical
```

Para validar outro endereco:

```powershell
$env:E2E_BASE_URL="https://gasparzinho-o4fo.vercel.app"
npm run e2e:smoke
```

O smoke cobre a abertura ou redirecionamento das telas de login, clientes, novo cliente com CEP, nova venda, entregas, cobranca, gastos, financeiro, relatorios e filiais. Tambem confere se APIs sensiveis de sugestao, backup e exportacao bloqueiam acesso sem sessao.

Se o servidor estiver fora do ar, o script falha com mensagem direta indicando a porta e o comando de inicializacao.

O teste critico cobre os fluxos mais caros para regressao:

- venda fiado gerando cobranca;
- pedido com entrega e endereco efetivo;
- cliente com endereco incompleto exigindo correcao;
- cobranca vencida visivel e acionavel;
- troca de filial preservando escopo;
- backup/exportacao protegidos.

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
