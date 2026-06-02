# Checklist de execucao multifilial

## Base tecnica

- [x] Criar `Organization` e `Branch`.
- [x] Criar filial padrao `branch_gasparzinho_default`.
- [x] Exibir filial ativa no layout.
- [x] Adicionar `organizationId` e `branchId` ao usuario.
- [x] Adicionar `branchId` opcional aos modelos operacionais.
- [x] Preencher dados antigos com filial padrao.
- [x] Criar indices por filial.
- [x] Criar unicidade por filial para cliente, produto e veiculo.
- [x] Incluir filiais no backup JSON e planilha.
- [x] Criar auditorias multifiliais.

## Escopo operacional

- [x] Clientes.
- [x] Vendas.
- [x] Entregas.
- [x] Cobranca.
- [x] Estoque.
- [x] Financeiro.
- [x] Gastos.
- [x] Relatorios.
- [x] Fechamento.
- [x] Fidelizacao.
- [x] Frota.
- [x] Backup e exportacoes.

## Seguranca e permissoes

- [x] ADMIN acessa visao consolidada e filial ativa.
- [x] VENDEDOR acessa apenas pagina principal, clientes, vendas, estoque e fidelizacao.
- [x] ENTREGADOR acessa apenas pagina principal e entregas.
- [x] Menu, middleware, paginas server-side e APIs sensiveis usam a mesma regra de perfil.
- [x] `requirePageAccess` protege URL direta de paginas sensiveis, incluindo cobranca, financeiro, gastos, relatorios, equipe, filiais, frota, fechamento e configuracoes.
- [x] APIs principais exigem sessao e perfil.
- [x] Rota legada de Recompra redireciona para Fidelizacao.
- [x] Seletor de filial valida organizacao e status.

## Validacao local

- [x] `npx tsc --noEmit`.
- [x] `npm run lint`.
- [x] `npm run build`.
- [x] `npm run vercel-build`.
- [x] `npm run branches:audit`.
- [x] `npm run branches:schema-audit`.
- [x] `npm run flows:audit`.
- [x] Base inicial `npm run e2e:smoke` criada para servidor local ou Vercel.
- [x] Base complementar `npm run e2e:critical` criada para fluxos de maior risco.
- [x] Base comportamental `npm run e2e:multifilial` criada para login, perfis, URL direta, APIs e isolamento entre filial padrao e filial norte.
- [x] Auditorias de dados listam amostras acionaveis dos problemas encontrados.
- [x] `npm run data:repair` simula por padrao; aplicacao real exige `npm run data:repair:apply`.
- [x] `npm run data:diagnose` criado para conferir URL, host e schema antes de auditoria/reparo.
- [x] `npm run branches:seed-test` simula segunda filial; aplicacao real exige `npm run branches:seed-test:apply`.

## Validacao pendente em producao ou ambiente com banco

- [ ] Rodar `npm run data:audit` e `npm run branches:data-audit` em ambiente com acesso ao banco sempre que houver importacao grande.
- [ ] Rodar `npm run e2e:smoke`, `npm run e2e:critical` e `npm run e2e:multifilial` com servidor local ativo e banco acessivel antes de publicar mudancas de permissao.
- [ ] Testar login ADMIN, VENDEDOR e ENTREGADOR com dados reais.
- [ ] Criar segunda filial real e testar isolamento.
- [ ] Confirmar por URL direta que perfis nao veem dados de outra filial nem modulos fora do papel.
- [ ] Validar backup isolado e backup consolidado.
- [ ] Validar relatorios consolidados apenas para administrador geral.

## Decisao futura

- [ ] Tornar `branchId` obrigatorio apenas depois da validacao de producao.
- [ ] Decidir se configuracoes de WhatsApp, mensagens e precos serao globais, por organizacao ou por filial.
