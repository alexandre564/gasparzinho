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

## Validação pendente em produção

- [ ] Rodar `npm run branches:data-audit` em ambiente com acesso ao banco.
- [ ] Testar login ADMIN, VENDEDOR e ENTREGADOR com dados reais.
- [ ] Criar segunda filial real e testar isolamento.
- [ ] Confirmar por URL direta que perfis não veem dados de outra filial.
- [ ] Validar backup isolado e backup consolidado.
- [ ] Validar relatórios consolidados apenas para administrador geral.

## Decisão futura

- [ ] Tornar `branchId` obrigatório apenas depois da validação de produção.
- [ ] Decidir se configurações de WhatsApp, mensagens e preços serão globais, por organização ou por filial.
