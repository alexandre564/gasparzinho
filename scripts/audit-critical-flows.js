const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function assertContains(content, pattern, description) {
  const matched = pattern instanceof RegExp ? pattern.test(content) : content.includes(pattern);

  if (!matched) {
    return `FALHA: ${description}`;
  }

  return null;
}

function listFiles(dir, matcher, files = []) {
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      listFiles(fullPath, matcher, files);
      continue;
    }

    if (matcher(fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
}

const checks = [
  {
    flow: 'Login',
    file: 'src/auth.ts',
    expectations: [
      [/Credentials\(/, 'login por credenciais configurado'],
      [/bcrypt\.compare/, 'senha validada por hash'],
      [/isActive/, 'usuario inativo bloqueado'],
      [/organizationId/, 'organizacao carregada na sessao'],
      [/branchId/, 'filial carregada na sessao'],
    ],
  },
  {
    flow: 'Clientes',
    file: 'src/app/dashboard/clientes/actions.ts',
    expectations: [
      [/requireActionAccess\(\['ADMIN', 'VENDEDOR'\]/, 'criacao/edicao exige perfil operacional'],
      [/getCurrentBranchScope\(/, 'escopo de filial obtido'],
      [/buildBranchWhere\(branchScope/, 'consultas usam filtro de filial'],
      [/branchId: branchScope\.branchId/, 'novos clientes recebem filial'],
      [/cleanCustomerTextFields/, 'dados importados/legados sao saneados'],
      [/street: z\.string\(\)\.trim\(\)\.min/, 'cadastro manual exige rua'],
      [/neighborhood: z\.string\(\)\.trim\(\)\.min/, 'cadastro manual exige bairro'],
    ],
  },
  {
    flow: 'Nova venda paga e fiado',
    file: 'src/app/dashboard/vendas/actions.ts',
    expectations: [
      [/tx\.order\.create/, 'pedido criado em transacao'],
      [/deliveryAddress/, 'endereco efetivo registrado no pedido'],
      [/saveDeliveryAddressToCustomer/, 'opcao de salvar novo endereco existe'],
      [/hasUsableDeliveryAddress/, 'pedido exige endereco utilizavel para entrega'],
      [/tx\.delivery\.create/, 'venda gera entrega'],
      [/paymentMethod === PaymentMethod\.FIADO/, 'venda fiado possui regra propria'],
      [/tx\.debt\.create/, 'venda fiado gera cobranca'],
      [/inventory:\s*\{\s*decrement/s, 'estoque decrementado na venda'],
      [/tx\.inventoryMovement\.create/, 'movimento de estoque registrado'],
      [/branchId/, 'pedido/entrega/cobranca recebem filial'],
    ],
  },
  {
    flow: 'Entregas',
    file: 'src/app/dashboard/entregas/actions.ts',
    expectations: [
      [/requireActionAccess\(\['ADMIN', 'ENTREGADOR'\]/, 'entrega exige perfil correto'],
      [/buildBranchWhere\(branchScope/, 'entrega consultada por filial'],
      [/markDeliverySentToDriver/, 'fluxo enviado ao entregador existe'],
      [/confirmDeliveryPayment/, 'confirmacao de entrega existe'],
      [/paymentResult: 'PAGO' \| 'A_RECEBER'/, 'entrega diferencia pago e a receber'],
      [/tx\.debt\.create/, 'entrega a receber gera cobranca quando necessario'],
      [/revalidatePath\('\/dashboard\/cobranca'\)/, 'cobranca revalidada apos entrega'],
    ],
  },
  {
    flow: 'Cobranca',
    file: 'src/app/dashboard/cobranca/actions.ts',
    expectations: [
      [/requireActionAccess\(\['ADMIN'\]/, 'cobranca restrita a administrador'],
      [/buildBranchWhere\(branchScope/, 'cobranca filtrada por filial'],
      [/renegotiatedAt/, 'renegociacao registrada'],
      [/renegotiatedValue/, 'valor renegociado registrado'],
      [/status: 'PAGO'/, 'pagamento possui status proprio'],
      [/branchId: branchScope\.branchId/, 'importacao/criacao recebe filial'],
    ],
  },
  {
    flow: 'Gastos e financeiro',
    file: 'src/app/dashboard/financeiro/despesas/actions.ts',
    expectations: [
      [/ExpenseSchema/, 'validacao de gasto existe'],
      [/branchId: branchScope\.branchId/, 'gasto criado na filial'],
      [/getFinancialSummary/, 'resumo financeiro por periodo existe'],
      [/getWeeklyChartData/, 'grafico financeiro por periodo existe'],
      [/importExpenses/, 'importacao de gastos existe'],
      [/buildBranchWhere\(branchScope/, 'consultas financeiras usam filial'],
    ],
  },
  {
    flow: 'Relatorios',
    file: 'src/app/dashboard/relatorios/actions.ts',
    expectations: [
      [/getCurrentBranchScope\(/, 'relatorio obtem filial atual'],
      [/buildBranchWhere\(branchScope/, 'relatorio usa escopo por filial'],
      [/daily|weekly|monthly|yearly/, 'periodos de relatorio suportados'],
    ],
  },
  {
    flow: 'Backup',
    file: 'src/app/api/backup/route.ts',
    expectations: [
      [/requireApiAccess\(\["ADMIN"\]\)/, 'backup restrito a administrador'],
      [/buildBranchWhere\(branchScope/, 'backup respeita filial ativa'],
      [/organizations/, 'organizacoes incluidas no backup'],
      [/branches/, 'filiais incluidas no backup'],
    ],
  },
  {
    flow: 'Filiais',
    file: 'src/app/dashboard/filiais/actions.ts',
    expectations: [
      [/requireActionAccess\(\['ADMIN'\]/, 'filiais restritas a administrador'],
      [/branchNameExists/, 'prevencao de filial duplicada'],
      [/organizationId: DEFAULT_ORGANIZATION_ID/, 'filial criada na organizacao principal'],
      [/normalizeOptionalDigits/, 'telefone/documento normalizados'],
      [/parseContractDueAt/, 'data contratual validada'],
    ],
  },
];

const failures = [];

for (const check of checks) {
  const content = read(check.file);
  for (const [pattern, description] of check.expectations) {
    const failure = assertContains(content, pattern, `${check.flow} - ${description} (${check.file})`);
    if (failure) failures.push(failure);
  }
}

const apiRouteFiles = listFiles(path.join(ROOT, 'src', 'app', 'api'), (filePath) => filePath.endsWith('route.ts'));
for (const filePath of apiRouteFiles) {
  const relativePath = path.relative(ROOT, filePath).replace(/\\/g, '/');
  const content = fs.readFileSync(filePath, 'utf8');

  if (relativePath === 'src/app/api/auth/[...nextauth]/route.ts') {
    continue;
  }

  if (!/export async function (GET|POST|PATCH|PUT|DELETE)/.test(content)) {
    continue;
  }

  if (!/requireApiAccess\(/.test(content)) {
    failures.push(`FALHA: API sem protecao de sessao/perfil (${relativePath})`);
  }
}

console.log('Auditoria de fluxos criticos');
console.log('============================');
console.log(`Fluxos auditados: ${checks.length}`);
console.log(`Rotas API auditadas: ${apiRouteFiles.length - 1}`);

if (failures.length > 0) {
  console.log('\nFalhas encontradas:');
  for (const failure of failures) {
    console.log(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Resultado: contratos minimos de login, clientes, vendas, fiado, entregas, cobranca, gastos, financeiro, relatorios, backup e filiais conferidos por analise estatica.');
