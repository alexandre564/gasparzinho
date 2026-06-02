# Checklist de execução multifilial

## Base técnica

- [x] Criar `Organization` e `Branch`.
- [x] Criar filial padrão `branch_gasparzinho_default`.
- [x] Exibir filial ativa no layout.
- [x] Adicionar `organizationId` e `branchId` ao usuário.
- [x] Adicionar `branchId` opcional aos modelos operacionais.
- [x] Preencher dados antigos com filial padrão.
- [x] Criar índices por filial.
- [x] Criar unicidade por filial para cliente, produto e veículo.
- [x] Incluir filiais no backup JSON e planilha.
- [x] Criar auditorias multifiliais.

## Escopo operacional

- [x] Clientes.
- [x] Vendas.
- [x] Entregas.
- [x] Cobrança.
- [x] Estoque.
- [x] Financeiro.
- [x] Gastos.
- [x] Relatórios.
- [x] Fechamento.
- [x] Fidelização.
- [x] Frota.
- [x] Backup e exportações.

## Segurança e permissões

- [x] ADMIN acessa visão consolidada e filial ativa.
- [x] VENDEDOR acessa módulos operacionais permitidos.
- [x] ENTREGADOR acessa entregas e página principal.
- [x] APIs principais exigem sessão e perfil.
- [x] Rota legada de Recompra redireciona para Fidelização.
- [x] Seletor de filial valida organização e status.

## Validação local

- [x] `npx tsc --noEmit`.
- [x] `npm run lint`.
- [x] `npm run build`.
- [x] `npm run vercel-build`.
- [x] `npm run branches:audit`.
- [x] `npm run branches:schema-audit`.
- [x] `npm run flows:audit`.
- [x] Base inicial `npm run e2e:smoke` criada para servidor local ou Vercel.
- [x] Base complementar `npm run e2e:critical` criada para fluxos de maior risco.
- [x] Auditorias de dados listam amostras acionaveis dos problemas encontrados.
- [x] `npm run data:repair` simula por padrao; aplicacao real exige `npm run data:repair:apply`.
- [x] `npm run data:diagnose` criado para conferir URL, host e schema antes de auditoria/reparo.
- [x] `npm run branches:seed-test` simula segunda filial; aplicacao real exige `npm run branches:seed-test:apply`.

## Validação pendente em produção

- [ ] Rodar `npm run data:audit` e `npm run branches:data-audit` em ambiente com acesso ao banco.
- [ ] Rodar `npm run e2e:smoke` e `npm run e2e:critical` com servidor local ativo.
- [ ] Testar login ADMIN, VENDEDOR e ENTREGADOR com dados reais.
- [ ] Criar segunda filial real e testar isolamento.
- [ ] Confirmar por URL direta que perfis não veem dados de outra filial.
- [ ] Validar backup isolado e backup consolidado.
- [ ] Validar relatórios consolidados apenas para administrador geral.

## Decisão futura

- [ ] Tornar `branchId` obrigatório apenas depois da validação de produção.
- [ ] Decidir se configurações de WhatsApp, mensagens e preços serão globais, por organização ou por filial.
