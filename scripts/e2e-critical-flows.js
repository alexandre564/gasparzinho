const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEFAULT_BASE_URL = 'http://localhost:3004';
const baseUrl = (process.env.E2E_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
const timeoutMs = Number.parseInt(process.env.E2E_TIMEOUT_MS || '12000', 10);

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertContains(content, pattern, message) {
  assert(pattern instanceof RegExp ? pattern.test(content) : content.includes(pattern), message);
}

async function request(pathname) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}${pathname}`, {
      redirect: 'manual',
      signal: controller.signal,
    });

    return {
      pathname,
      status: response.status,
      location: response.headers.get('location'),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function assertHttpOk(result, label) {
  const allowed = [200, 302, 303, 307, 308, 401, 403];
  assert(
    allowed.includes(result.status),
    `${label} (${result.pathname}) retornou HTTP ${result.status}; esperado resposta valida ou bloqueio de sessao.`,
  );
}

function formatConnectionError(error) {
  if (error.name === 'AbortError') {
    return `Tempo limite de ${timeoutMs}ms excedido ao conectar no servidor.`;
  }

  const causeCode = error?.cause?.code;
  if (causeCode === 'ECONNREFUSED') {
    return 'Conexao recusada: o servidor local provavelmente nao esta aberto na porta esperada.';
  }

  if (causeCode === 'EACCES') {
    return 'Acesso de rede negado pelo ambiente atual antes de receber resposta HTTP. Rode este teste no PowerShell local liberado ou no ambiente que acessa Vercel/Neon.';
  }

  if (error.message === 'fetch failed') {
    return 'Fetch falhou antes de receber resposta HTTP. Confira servidor, porta e E2E_BASE_URL.';
  }

  return error.message || String(error);
}

function runContractChecks() {
  const vendaAction = read('src/app/dashboard/vendas/actions.ts');
  assertContains(vendaAction, /hasUsableDeliveryAddress/, 'Venda precisa validar endereco de entrega utilizavel.');
  assertContains(vendaAction, /Complete o endereco de entrega/, 'Venda precisa bloquear entrega sem endereco.');
  assertContains(vendaAction, /tx\.delivery\.create/, 'Venda precisa gerar entrega.');
  assertContains(vendaAction, /paymentMethod === PaymentMethod\.FIADO[\s\S]+tx\.debt\.create/, 'Venda fiado precisa gerar cobranca.');
  assertContains(vendaAction, /branchId: branchScope\.branchId|branchId,/, 'Venda precisa gravar filial.');

  const vendaForm = read('src/app/dashboard/vendas/novo/OrderForm.tsx');
  assertContains(vendaForm, /deliveryAddressIncomplete/, 'Formulario de venda precisa sinalizar endereco incompleto.');
  assertContains(vendaForm, /disabled=\{form\.formState\.isSubmitting \|\| deliveryAddressIncomplete\}/, 'Formulario de venda precisa impedir envio sem endereco.');

  const clienteAction = read('src/app/dashboard/clientes/actions.ts');
  assertContains(clienteAction, /street: z\.string\(\)\.trim\(\)\.min/, 'Cliente manual precisa exigir rua.');
  assertContains(clienteAction, /number: z\.string\(\)\.trim\(\)\.min/, 'Cliente manual precisa exigir numero.');
  assertContains(clienteAction, /neighborhood: z\.string\(\)\.trim\(\)\.min/, 'Cliente manual precisa exigir bairro.');
  assertContains(clienteAction, /buildBranchWhere\(branchScope/, 'Clientes precisam respeitar escopo por filial.');

  const cobrancaPage = read('src/app/dashboard/cobranca/page.tsx');
  assertContains(cobrancaPage, /overdueOnPage/, 'Cobranca precisa destacar vencidos.');
  assertContains(cobrancaPage, /debt\.isOverdue/, 'Cobranca precisa usar regra estrutural de atraso, sem contar pagas/canceladas.');
  assertContains(cobrancaPage, /Dias em Atraso/, 'Cobranca precisa exibir dias em atraso.');
  assertContains(cobrancaPage, /Renegociacao|Renegocia/, 'Cobranca precisa exibir renegociacao.');

  const cobrancaAction = read('src/app/dashboard/cobranca/actions.ts');
  assertContains(cobrancaAction, /effectiveStatus/, 'Cobranca precisa calcular status efetivo.');
  assertContains(cobrancaAction, /isDebtClosedStatus/, 'Cobranca precisa tratar status pagos/cancelados como fechados.');
  assertContains(cobrancaAction, /buildBranchWhere\(branchScope/, 'Cobranca precisa respeitar filial.');
  assertContains(cobrancaAction, /status: fullPayment \? 'PAGO' : 'RENEGOCIADO'/, 'Renegociacao parcial precisa manter cobranca em aberto.');
  assertContains(cobrancaAction, /createDebtPaymentCashEntry/, 'Pagamento de divida precisa gerar entrada no caixa do dia.');
  assertContains(cobrancaAction, /CASH_ENTRY_SOURCE_DEBT_PARTIAL_PAYMENT/, 'Pagamento parcial de renegociacao precisa gerar entrada proporcional no caixa.');
  assertContains(cobrancaAction, /cancelDebtWithAudit/, 'Cancelamento administrativo de divida precisa existir no backend.');
  assertContains(cobrancaAction, /requireActionAccess\(\['ADMIN'\]\)/, 'Cancelamento de divida precisa ser restrito a ADMIN no backend.');
  assertContains(cobrancaAction, /status: 'CANCELADA'/, 'Cancelamento de divida precisa ser logico, sem apagar historico.');

  const cashFlow = read('src/lib/cash-flow.ts');
  assertContains(cashFlow, /getCashRevenueTotal/, 'Financeiro precisa consolidar vendas pagas e recebimentos de fiado em regime de caixa.');
  assertContains(cashFlow, /paymentMethod:\s*\{\s*not:\s*FIADO_PAYMENT_METHOD/, 'Vendas fiadas nao podem entrar no caixa antes do recebimento.');

  const cobrancaResumo = read('src/app/dashboard/cobranca/[id]/page.tsx') + read('src/app/dashboard/cobranca/[id]/DeleteDebtButton.tsx');
  assertContains(cobrancaResumo, /DeleteDebtButton/, 'Resumo da cobranca precisa expor acao administrativa para divida.');
  assertContains(cobrancaResumo, /CANCELAR/, 'Exclusao administrativa de divida precisa exigir confirmacao forte.');

  const entregaPage = read('src/app/dashboard/entregas/page.tsx');
  assertContains(entregaPage, /missingAddress|endere[cç]o/i, 'Entregas precisam sinalizar endereco faltante.');
  assertContains(entregaPage, /hasUsableDeliveryAddress/, 'Entregas precisam validar endereco antes de mapa/rota.');

  const branchScope = read('src/lib/current-branch-scope.ts') + read('src/lib/branch-scope.ts');
  assertContains(branchScope, /selectedBranchId|gasparzinho_branch_scope/, 'Troca de filial precisa ter escopo persistido.');
  assertContains(branchScope, /canSeeAllBranches/, 'Administrador precisa poder alternar visao consolidada.');

  const backupRoute = read('src/app/api/backup/route.ts') + read('src/app/api/backup/planilha/route.ts');
  assertContains(backupRoute, /requireApiAccess\(\["ADMIN"\]\)/, 'Backup precisa ser restrito a administrador.');
  assertContains(backupRoute, /buildBranchWhere\(branchScope/, 'Backup precisa respeitar filial ativa.');

  const dashboard = read('src/app/dashboard/page.tsx');
  assertContains(dashboard, /DateRangeFilter/, 'Dashboard precisa ter filtro de periodo De/Ate.');
  assertContains(dashboard, /salesMonth/, 'Dashboard precisa manter indicador de vendas no mes.');
  assertContains(dashboard, /getCashRevenueTotal/, 'Dashboard precisa mostrar entradas em caixa com pagamentos de fiado.');

  const fechamento = read('src/app/dashboard/fechamento/actions.ts') + read('src/app/dashboard/fechamento/ClosingSummary.tsx');
  assertContains(fechamento, /cashEntries/, 'Fechamento precisa incluir recebimentos de fiado do dia.');
  assertContains(fechamento, /paymentMethod:\s*\{\s*not:\s*FIADO_PAYMENT_METHOD/, 'Fechamento precisa separar vendas fiadas de entradas reais em caixa.');

  const seedTest = read('scripts/seed-test-branches.js');
  assertContains(seedTest, /branch_gasparzinho_teste_norte/, 'Cenario de segunda filial precisa estar preparado.');
}

async function runHttpChecks() {
  const checks = [
    { pathname: '/login', label: 'login' },
    { pathname: '/dashboard/vendas/novo', label: 'nova venda protegida' },
    { pathname: '/dashboard/cobranca', label: 'cobranca protegida' },
    { pathname: '/dashboard/filiais', label: 'filiais protegida' },
    { pathname: '/api/backup', label: 'backup protegido' },
    { pathname: '/api/clientes/modelo', label: 'modelo clientes protegido' },
  ];

  const results = [];

  for (const check of checks) {
    const result = await request(check.pathname);
    assertHttpOk(result, check.label);
    results.push({ ...check, ...result });
  }

  return results;
}

async function main() {
  runContractChecks();
  const results = await runHttpChecks();

  console.log('E2E critico operacional');
  console.log('=======================');
  console.log(`Base URL: ${baseUrl}`);
  for (const result of results) {
    console.log(`${result.label}: ${result.pathname} -> HTTP ${result.status}${result.location ? ` -> ${result.location}` : ''}`);
  }
  console.log('Resultado: contratos criticos conferidos e servidor validado para rotas de venda, cobranca, filiais e backup.');
}

main().catch((error) => {
  console.error(`Falha no E2E critico em ${baseUrl}.`);
  console.error(formatConnectionError(error));
  const parsed = new URL(baseUrl);
  if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
    console.error('Confirme que o servidor esta ativo antes de rodar: npm run dev -- --port 3004');
  } else {
    console.error('Como a base URL e externa, confirme se este terminal tem permissao de rede para acessar a Internet.');
  }
  console.error('Para outro endereco, defina E2E_BASE_URL. Exemplo: $env:E2E_BASE_URL="http://localhost:3005"');
  process.exit(1);
});
