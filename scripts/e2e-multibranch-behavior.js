const { withDatabase, formatDatabaseError } = require('./database');

const DEFAULT_BASE_URL = 'http://localhost:3004';
const baseUrl = (process.env.E2E_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
const timeoutMs = Number.parseInt(process.env.E2E_TIMEOUT_MS || '15000', 10);

const DEFAULT_BRANCH_ID = 'branch_gasparzinho_default';
const NORTH_BRANCH_ID = 'branch_gasparzinho_teste_norte';

const accounts = {
  admin: {
    label: 'ADMIN padrao',
    email: process.env.E2E_ADMIN_EMAIL || 'admin@gasparzinho.com',
    password: process.env.E2E_ADMIN_PASSWORD || 'admin123',
    role: 'ADMIN',
    allowedPages: [
      '/dashboard',
      '/dashboard/clientes',
      '/dashboard/vendas/novo',
      '/dashboard/cobranca',
      '/dashboard/entregas',
      '/dashboard/financeiro',
      '/dashboard/gastos',
      '/dashboard/relatorios',
      '/dashboard/equipe',
      '/dashboard/filiais',
      '/dashboard/frota',
      '/dashboard/fechamento',
      '/dashboard/configuracoes',
    ],
    blockedPages: [],
    allowedApis: ['/api/backup', '/api/clientes/sugestoes?q=teste', '/api/cobranca/exportar', '/api/financeiro/exportar'],
    blockedApis: [],
  },
  northSeller: {
    label: 'VENDEDOR filial norte',
    email: process.env.E2E_NORTH_SELLER_EMAIL || 'vendedor-norte@gasparzinho.com',
    password: process.env.E2E_NORTH_SELLER_PASSWORD || process.env.TEST_BRANCH_PASSWORD || 'teste123',
    role: 'VENDEDOR',
    branchId: NORTH_BRANCH_ID,
    allowedPages: ['/dashboard', '/dashboard/clientes', '/dashboard/vendas/novo'],
    blockedPages: [
      '/dashboard/cobranca',
      '/dashboard/entregas',
      '/dashboard/financeiro',
      '/dashboard/gastos',
      '/dashboard/relatorios',
      '/dashboard/equipe',
      '/dashboard/filiais',
      '/dashboard/frota',
      '/dashboard/fechamento',
      '/dashboard/configuracoes',
    ],
    allowedApis: ['/api/clientes/sugestoes?q=teste'],
    blockedApis: [
      '/api/backup',
      '/api/backup/planilha',
      '/api/cobranca/exportar',
      '/api/cobranca/modelo',
      '/api/entregas/exportar',
      '/api/financeiro/exportar',
      '/api/financeiro/despesas/exportar',
      '/api/relatorios/exportar',
      '/api/equipe/exportar',
      '/api/frota/exportar',
      '/api/fechamento/exportar',
    ],
  },
  northDriver: {
    label: 'ENTREGADOR filial norte',
    email: process.env.E2E_NORTH_DRIVER_EMAIL || 'entregador-norte@gasparzinho.com',
    password: process.env.E2E_NORTH_DRIVER_PASSWORD || process.env.TEST_BRANCH_PASSWORD || 'teste123',
    role: 'ENTREGADOR',
    branchId: NORTH_BRANCH_ID,
    allowedPages: ['/dashboard', '/dashboard/entregas'],
    blockedPages: [
      '/dashboard/clientes',
      '/dashboard/vendas/novo',
      '/dashboard/cobranca',
      '/dashboard/financeiro',
      '/dashboard/gastos',
      '/dashboard/relatorios',
      '/dashboard/equipe',
      '/dashboard/filiais',
      '/dashboard/frota',
      '/dashboard/fechamento',
      '/dashboard/configuracoes',
    ],
    allowedApis: ['/api/entregas/exportar'],
    blockedApis: [
      '/api/backup',
      '/api/backup/planilha',
      '/api/clientes/sugestoes?q=teste',
      '/api/cobranca/exportar',
      '/api/cobranca/modelo',
      '/api/financeiro/exportar',
      '/api/financeiro/despesas/exportar',
      '/api/relatorios/exportar',
      '/api/equipe/exportar',
      '/api/frota/exportar',
      '/api/fechamento/exportar',
    ],
  },
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function formatNetworkError(error) {
  if (error.name === 'AbortError') {
    return `Tempo limite de ${timeoutMs}ms excedido ao conectar no servidor.`;
  }

  const causeCode = error?.cause?.code;
  if (causeCode === 'EACCES') {
    return 'Acesso de rede negado pelo ambiente atual antes de receber resposta HTTP. Rode este teste no PowerShell local liberado ou no ambiente que acessa Vercel/Neon.';
  }

  if (causeCode === 'ECONNREFUSED') {
    return 'Conexao recusada: o servidor local provavelmente nao esta aberto na porta esperada.';
  }

  if (error.message === 'fetch failed') {
    return 'Fetch falhou antes de receber resposta HTTP. Confira servidor, porta e E2E_BASE_URL.';
  }

  return error.message || String(error);
}

function getSetCookies(headers) {
  if (typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie();
  }

  const combined = headers.get('set-cookie');
  if (!combined) return [];

  return combined.split(/,(?=\s*[^;,]+=)/g);
}

class CookieJar {
  constructor() {
    this.cookies = new Map();
  }

  store(headers) {
    for (const cookie of getSetCookies(headers)) {
      const [pair] = cookie.split(';');
      const separator = pair.indexOf('=');
      if (separator <= 0) continue;
      this.cookies.set(pair.slice(0, separator).trim(), pair.slice(separator + 1).trim());
    }
  }

  header() {
    return Array.from(this.cookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
  }
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      redirect: 'manual',
      signal: controller.signal,
      ...options,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function request(pathname, jar, options = {}) {
  const headers = new Headers(options.headers || {});
  const cookie = jar?.header();
  if (cookie) headers.set('cookie', cookie);

  const response = await fetchWithTimeout(`${baseUrl}${pathname}`, {
    ...options,
    headers,
  });

  jar?.store(response.headers);

  return {
    pathname,
    status: response.status,
    location: response.headers.get('location') || '',
    contentType: response.headers.get('content-type') || '',
    response,
  };
}

async function signIn(account) {
  const jar = new CookieJar();
  const csrfResponse = await request('/api/auth/csrf', jar);
  assert(csrfResponse.status === 200, `${account.label}: nao foi possivel obter CSRF (${csrfResponse.status}).`);

  const csrf = await csrfResponse.response.json();
  assert(csrf.csrfToken, `${account.label}: CSRF ausente.`);

  const body = new URLSearchParams({
    csrfToken: csrf.csrfToken,
    email: account.email,
    password: account.password,
    callbackUrl: `${baseUrl}/dashboard`,
    redirect: 'false',
    json: 'true',
  });

  const loginResponse = await request('/api/auth/callback/credentials', jar, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'x-auth-return-redirect': '1',
    },
    body,
  });

  assert([200, 302, 303, 307, 308].includes(loginResponse.status), `${account.label}: login retornou HTTP ${loginResponse.status}.`);

  const session = await request('/api/auth/session', jar);
  assert(session.status === 200, `${account.label}: sessao retornou HTTP ${session.status}.`);
  const sessionBody = await session.response.json();
  assert(sessionBody?.user?.email?.toLowerCase() === account.email.toLowerCase(), `${account.label}: sessao nao corresponde ao usuario esperado.`);
  assert(sessionBody?.user?.role?.toUpperCase() === account.role, `${account.label}: perfil esperado ${account.role}, recebido ${sessionBody?.user?.role}.`);

  if (account.branchId) {
    assert(sessionBody.user.branchId === account.branchId, `${account.label}: filial esperada ${account.branchId}, recebida ${sessionBody.user.branchId}.`);
  }

  return jar;
}

function isAllowedPageStatus(status) {
  return status === 200;
}

function isBlockedPageStatus(result) {
  return [302, 303, 307, 308, 401, 403].includes(result.status) && (!result.location || result.location.includes('/dashboard') || result.location.includes('/login'));
}

function isAllowedApiStatus(status) {
  return status >= 200 && status < 300;
}

function isBlockedApiStatus(status) {
  return status === 401 || status === 403;
}

async function validateAccountNavigation(account, jar) {
  const results = [];

  for (const pathname of account.allowedPages) {
    const result = await request(pathname, jar);
    assert(isAllowedPageStatus(result.status), `${account.label}: pagina permitida ${pathname} retornou HTTP ${result.status}.`);
    results.push(`${account.label}: ${pathname} permitido`);
  }

  for (const pathname of account.blockedPages) {
    const result = await request(pathname, jar);
    assert(
      isBlockedPageStatus(result),
      `${account.label}: pagina bloqueada ${pathname} retornou HTTP ${result.status}${result.location ? ` -> ${result.location}` : ''}.`,
    );
    results.push(`${account.label}: ${pathname} bloqueado`);
  }

  for (const pathname of account.allowedApis) {
    const result = await request(pathname, jar);
    assert(isAllowedApiStatus(result.status), `${account.label}: API permitida ${pathname} retornou HTTP ${result.status}.`);
    results.push(`${account.label}: ${pathname} permitido`);
  }

  for (const pathname of account.blockedApis) {
    const result = await request(pathname, jar);
    assert(isBlockedApiStatus(result.status), `${account.label}: API bloqueada ${pathname} retornou HTTP ${result.status}.`);
    results.push(`${account.label}: ${pathname} bloqueado`);
  }

  return results;
}

async function validateDatabaseScenario() {
  return withDatabase(async (client, schema) => {
    const branchResult = await client.query(
      'SELECT "id", "name", "status" FROM "Branch" WHERE "id" = ANY($1::text[]) ORDER BY "id"',
      [[DEFAULT_BRANCH_ID, NORTH_BRANCH_ID]],
    );
    const branches = new Map(branchResult.rows.map((row) => [row.id, row]));
    assert(branches.has(DEFAULT_BRANCH_ID), 'Filial padrao nao encontrada.');
    assert(branches.has(NORTH_BRANCH_ID), 'Filial norte de teste nao encontrada.');

    const userEmails = Object.values(accounts).map((account) => account.email.toLowerCase());
    const users = await client.query(
      'SELECT "email", "role", "branchId", "isActive" FROM "User" WHERE LOWER("email") = ANY($1::text[])',
      [userEmails],
    );
    const usersByEmail = new Map(users.rows.map((row) => [row.email.toLowerCase(), row]));

    for (const account of Object.values(accounts)) {
      const user = usersByEmail.get(account.email.toLowerCase());
      assert(user, `${account.label}: usuario nao encontrado no banco.`);
      assert(user.isActive, `${account.label}: usuario inativo.`);
      assert(String(user.role).toUpperCase() === account.role, `${account.label}: perfil do banco divergente.`);
      if (account.branchId) {
        assert(user.branchId === account.branchId, `${account.label}: filial do banco divergente.`);
      }
    }

    const operationalTables = ['Customer', 'Product', 'Order', 'Delivery', 'Debt', 'Expense', 'Vehicle', 'DailyClosing'];
    const distribution = [];
    for (const table of operationalTables) {
      const result = await client.query(`SELECT COALESCE("branchId", 'SEM_FILIAL') AS branch_id, COUNT(*)::int AS total FROM "${table}" GROUP BY 1 ORDER BY 1`);
      distribution.push({ table, rows: result.rows });
    }

    await client.query('BEGIN');
    try {
      const suffix = Date.now();
      await client.query(
        `INSERT INTO "Customer" ("id", "name", "phone", "street", "number", "neighborhood", "city", "branchId", "createdAt", "updatedAt")
         VALUES
         ($1, 'Teste Isolamento Padrao', $2, 'Rua Teste', '10', 'Centro', 'Lavras', $3, NOW(), NOW()),
         ($4, 'Teste Isolamento Norte', $5, 'Rua Norte', '20', 'Centro', 'Lavras', $6, NOW(), NOW())`,
        [
          `audit_customer_default_${suffix}`,
          `3599900${String(suffix).slice(-6)}`,
          DEFAULT_BRANCH_ID,
          `audit_customer_north_${suffix}`,
          `3599911${String(suffix).slice(-6)}`,
          NORTH_BRANCH_ID,
        ],
      );

      const defaultOnly = await client.query('SELECT COUNT(*)::int AS total FROM "Customer" WHERE "branchId" = $1 AND "name" ILIKE $2', [DEFAULT_BRANCH_ID, '%Isolamento Norte%']);
      const northOnly = await client.query('SELECT COUNT(*)::int AS total FROM "Customer" WHERE "branchId" = $1 AND "name" ILIKE $2', [NORTH_BRANCH_ID, '%Isolamento Padrao%']);

      assert(defaultOnly.rows[0].total === 0, 'Consulta da filial padrao vazou cliente da filial norte.');
      assert(northOnly.rows[0].total === 0, 'Consulta da filial norte vazou cliente da filial padrao.');
    } finally {
      await client.query('ROLLBACK');
    }

    return { schema, branches: branchResult.rows, users: users.rows, distribution };
  });
}

async function main() {
  const db = await validateDatabaseScenario();
  const navigationResults = [];

  for (const account of Object.values(accounts)) {
    const jar = await signIn(account);
    navigationResults.push(...(await validateAccountNavigation(account, jar)));
  }

  console.log('E2E comportamental multifilial');
  console.log('==============================');
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Schema: ${db.schema}`);
  console.log(`Filiais verificadas: ${db.branches.map((branch) => `${branch.id} (${branch.status})`).join(', ')}`);
  console.log(`Usuarios verificados: ${db.users.map((user) => `${user.email}/${user.role}/${user.branchId || 'sem filial'}`).join(', ')}`);
  console.log('Distribuicao operacional por filial:');
  for (const item of db.distribution) {
    const summary = item.rows.map((row) => `${row.branch_id}:${row.total}`).join(', ') || 'sem registros';
    console.log(`- ${item.table}: ${summary}`);
  }
  console.log('Permissoes e navegacao:');
  for (const line of navigationResults) {
    console.log(`- ${line}`);
  }
  console.log('Resultado: login, perfis, escopo basico por filial, bloqueios por URL/API e isolamento transacional conferidos.');
}

main().catch((error) => {
  const message = error?.code ? formatDatabaseError(error) : formatNetworkError(error);
  console.error(`Falha no E2E comportamental multifilial em ${baseUrl}: ${message}`);
  console.error('Requisitos: servidor ativo, banco acessivel, usuarios seedados e variaveis AUTH_SECRET/NEXTAUTH_SECRET iguais ao ambiente testado.');
  process.exit(1);
});
