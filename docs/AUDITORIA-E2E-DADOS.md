# Auditoria, E2E e saneamento operacional

## Ordem recomendada

1. Rodar validacoes estaticas:

```powershell
npm run flows:audit
npm run branches:audit
npm run branches:schema-audit
```

2. Rodar auditorias de dados em ambiente com acesso ao Neon:

```powershell
npm run data:diagnose
npm run data:audit
npm run branches:data-audit
```

`npm run data:diagnose` mostra a origem da URL (`AUDIT_DATABASE_URL`, `DIRECT_URL` ou `DATABASE_URL`), o host mascarado e o schema ativo antes de qualquer reparo. Se houver `EACCES`, o ambiente atual nao tem permissao de rede para o banco; rode no PowerShell local com acesso ao Neon.

3. Se houver problemas saneaveis, simular reparo sem gravar:

```powershell
npm run data:repair
```

4. Aplicar reparos apenas depois de revisar a simulacao:

```powershell
npm run data:repair:apply
```

## O que a auditoria operacional aponta

- Pedidos fiados sem cobranca.
- Pedidos ativos sem entrega.
- Cobrancas vencidas ainda pendentes.
- Produtos com estoque negativo.
- Clientes sem endereco completo para entrega.
- Clientes com codificacao suspeita de importacao.
- Telefones duplicados por filial.
- Pedidos sem endereco de entrega registrado.
- Usuarios com perfil invalido.

Use `AUDIT_DETAIL_LIMIT=50` para ampliar as amostras detalhadas.

## Politica para clientes sem endereco completo

Clientes importados podem continuar no cadastro para nao perder base historica. A regra operacional e:

- novo cliente manual deve ter rua, numero, bairro e cidade;
- nova venda com entrega nao pode ser finalizada sem endereco utilizavel;
- cliente antigo incompleto deve ser complementado quando voltar a comprar;
- CEP e desejavel para saneamento, mas rua, numero, bairro e cidade sao os campos minimos para entrega.

## E2E minimo

Com o servidor ativo:

```powershell
npm run dev -- --port 3004
npm run e2e:smoke
npm run e2e:critical
npm run e2e:multifilial
```

Para outro endereco:

```powershell
$env:E2E_BASE_URL="https://gasparzinho-o4fo.vercel.app"
npm run e2e:smoke
```

O smoke atual nao cria dados reais. Ele valida disponibilidade, redirecionamentos e protecao de APIs sensiveis. A automacao completa de login autenticado, criacao de cliente, venda paga, venda fiado, entrega, gasto e backup deve ser feita depois com usuario de teste e massa de dados controlada.

`npm run e2e:critical` complementa o smoke: alem de consultar rotas essenciais com o servidor ativo, confere contratos de alto risco em venda fiado, endereco de entrega, cobranca vencida, troca de filial e backup.

`npm run e2e:multifilial` e o teste comportamental real para a fase atual. Ele exige servidor ativo, banco acessivel e filial norte seedada. O teste entra com ADMIN, VENDEDOR e ENTREGADOR, valida rotas permitidas e bloqueadas por navegacao e URL direta, confere APIs sensiveis e faz uma simulacao transacional de isolamento entre filial padrao e filial norte sem gravar clientes permanentes.

Regra critica validada: VENDEDOR nao pode acessar `/dashboard/cobranca` nem outras areas administrativas como financeiro, gastos, relatorios, equipe, filiais, frota, fechamento e configuracoes. O bloqueio deve existir na pagina server-side e nas APIs, nao apenas no menu.

## Teste multifilial manual minimo

1. Criar uma segunda filial em `/dashboard/filiais`.
2. Criar um usuario vendedor vinculado a essa filial.
3. Entrar com esse usuario e cadastrar cliente/produto/pedido.
4. Confirmar que clientes, vendas, cobrancas, entregas, estoque, gastos, relatorios e backup nao mostram dados da filial padrao.
5. Entrar como administrador e alternar entre "Todas as filiais" e cada filial ativa para validar visao consolidada e isolada.

Para reduzir trabalho manual, existe um seed seguro em modo simulacao:

```powershell
npm run branches:seed-test
```

Depois de revisar a simulacao, aplique com:

```powershell
npm run branches:seed-test:apply
```

Com a segunda filial aplicada, o ciclo minimo desta fase e:

```powershell
npm run data:diagnose
npm run branches:data-audit
npm run e2e:multifilial
```
