const DEFAULT_BASE_URL = 'http://localhost:3004';
const baseUrl = (process.env.E2E_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '');

async function request(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    redirect: 'manual',
    ...options,
  });

  return {
    pathname,
    status: response.status,
    location: response.headers.get('location'),
    contentType: response.headers.get('content-type') || '',
  };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const checks = [];

  const login = await request('/login');
  checks.push(login);
  assert(login.status === 200, `Login deveria abrir com 200, retornou ${login.status}.`);

  const dashboard = await request('/dashboard');
  checks.push(dashboard);
  assert(
    dashboard.status === 200 || [302, 303, 307, 308].includes(dashboard.status),
    `Dashboard deveria responder ou redirecionar para login, retornou ${dashboard.status}.`,
  );

  const clientesApi = await request('/api/clientes/sugestoes?q=teste');
  checks.push(clientesApi);
  assert(
    clientesApi.status === 401 || clientesApi.status === 403,
    `API de sugestoes sem login deveria bloquear acesso, retornou ${clientesApi.status}.`,
  );

  const backupApi = await request('/api/backup');
  checks.push(backupApi);
  assert(
    backupApi.status === 401 || backupApi.status === 403,
    `Backup sem login deveria bloquear acesso, retornou ${backupApi.status}.`,
  );

  const protectedExport = await request('/api/vendas/exportar');
  checks.push(protectedExport);
  assert(
    protectedExport.status === 401 || protectedExport.status === 403,
    `Exportacao de vendas sem login deveria bloquear acesso, retornou ${protectedExport.status}.`,
  );

  console.log('Smoke E2E minimo');
  console.log('================');
  for (const check of checks) {
    console.log(`${check.pathname}: HTTP ${check.status}${check.location ? ` -> ${check.location}` : ''}`);
  }
  console.log('Resultado: servidor respondeu e rotas sensiveis bloquearam acesso sem sessao.');
}

main().catch((error) => {
  console.error(`Falha no smoke E2E em ${baseUrl}: ${error.message}`);
  process.exit(1);
});
