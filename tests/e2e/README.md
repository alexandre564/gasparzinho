# Base E2E do Gasparzinho

Esta pasta registra a base de validacao ponta a ponta do sistema.

## Scripts disponiveis

- `npm run e2e:smoke`: valida um servidor ja aberto, por padrao em `http://localhost:3004`.
- `npm run flows:audit`: confere contratos minimos dos fluxos criticos por analise estatica.

## Como rodar o smoke local

1. Abra o sistema local na porta 3004.
2. Rode:

```powershell
npm run e2e:smoke
```

Para validar outro endereco:

```powershell
$env:E2E_BASE_URL="https://gasparzinho-o4fo.vercel.app"
npm run e2e:smoke
```

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
