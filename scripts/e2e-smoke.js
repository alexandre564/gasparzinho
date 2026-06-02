const DEFAULT_BASE_URL = 'http://localhost:3004';
const baseUrl = (process.env.E2E_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
const timeoutMs = Number.parseInt(process.env.E2E_TIMEOUT_MS || '10000', 10);

const pageChecks = [
  { pathname: '/login', expected: [200], label: 'login' },
  { pathname: '/dashboard', expected: [200, 302, 303, 307, 308], label: 'pagina principal protegida' },
  { pathname: '/dashboard/clientes', expected: [200, 302, 303, 307, 308], label: 'clientes' },
  { pathname: '/dashboard/clientes/novo', expected: [200, 302, 303, 307, 308], label: 'cliente com CEP' },
  { pathname: '/dashboard/vendas/novo', expected: [200, 302, 303, 307, 308], label: 'nova venda paga/fiado' },
  { pathname: '/dashboard/entregas', expected: [200, 302, 303, 307, 308], label: 'entregas' },
  { pathname: '/dashboard/cobranca', expected: [200, 302, 303, 307, 308], label: 'cobranca' },
  { pathname: '/dashboard/financeiro/despesas', expected: [200, 302, 303, 307, 308], label: 'gastos' },
  { pathname: '/dashboard/financeiro', expected: [200, 302, 303, 307, 308], label: 'financeiro' },
  { pathname: '/dashboard/relatorios', expected: [200, 302, 303, 307, 308], label: 'relatorios' },
  { pathname: '/dashboard/filiais', expected: [200, 302, 303, 307, 308], label: 'filiais' },
];

const protectedApiChecks = [
  { pathname: '/api/clientes/sugestoes?q=teste', label: 'sugestoes de clientes' },
  { pathname: '/api/backup', label: 'backup JSON' },
  { pathname: '/api/backup/planilha', label: 'backup planilha' },
  { pathname: '/api/vendas/exportar', label: 'exportacao de vendas' },
  { pathname: '/api/cobranca/exportar', label: 'exportacao de cobranca' },
  { pathname: '/api/entregas/exportar', label: 'exportacao de entregas' },
  { pathname: '/api/financeiro/despesas/exportar', label: 'exportacao de gastos' },
  { pathname: '/api/fidelizacao/exportar', label: 'exportacao de fidelizacao' },
];

async function request(pathname, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}${pathname}`, {
      redirect: 'manual',
      signal: controller.signal,
      ...options,
    });

    return {
      pathname,
      status: response.status,
      location: response.headers.get('location'),
      contentType: response.headers.get('content-type') || '',
    };
  } finally {
    clearTimeout(timeout);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function isAuthBlocked(status) {
  return status === 401 || status === 403 || [302, 303, 307, 308].includes(status);
}

async function main() {
  const checks = [];

  for (const check of pageChecks) {
    const result = await request(check.pathname);
    checks.push({ ...result, label: check.label });
    assert(
      check.expected.includes(result.status),
      `${check.label} (${check.pathname}) retornou HTTP ${result.status}; esperado: ${check.expected.join(', ')}.`,
    );
  }

  for (const check of protectedApiChecks) {
    const result = await request(check.pathname);
    checks.push({ ...result, label: check.label });
    assert(
      isAuthBlocked(result.status),
      `${check.label} (${check.pathname}) deveria bloquear acesso sem sessao; retornou HTTP ${result.status}.`,
    );
  }

  console.log('Smoke E2E minimo');
  console.log('================');
  console.log(`Base URL: ${baseUrl}`);
  for (const check of checks) {
    console.log(`${check.label}: ${check.pathname} -> HTTP ${check.status}${check.location ? ` -> ${check.location}` : ''}`);
  }
  console.log('Resultado: servidor respondeu, paginas criticas abriram/redirecionaram e APIs sensiveis bloquearam acesso sem sessao.');
}

main().catch((error) => {
  console.error(`Falha no smoke E2E em ${baseUrl}.`);
  console.error(error.name === 'AbortError' ? `Tempo limite de ${timeoutMs}ms excedido.` : error.message);
  console.error('Confirme que o servidor esta ativo. Exemplo: cd "C:\\Users\\User\\Documents\\New project\\gasparzinho-v2-work"; npm run dev -- --port 3004');
  console.error('Para outro endereco, defina E2E_BASE_URL antes de rodar npm run e2e:smoke.');
  process.exit(1);
});
