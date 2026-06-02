const { Client } = require('pg');
require('dotenv/config');

function getConnectionUrl() {
  const url = process.env.AUDIT_DATABASE_URL || process.env.DIRECT_URL || process.env.DATABASE_URL;

  if (!url) {
    throw new Error('AUDIT_DATABASE_URL, DIRECT_URL ou DATABASE_URL nao foi encontrada.');
  }

  return url;
}

function getSchemaName(url) {
  const parsed = new URL(url);
  return parsed.searchParams.get('schema') || 'public';
}

function quoteIdentifier(value) {
  return `"${value.replace(/"/g, '""')}"`;
}

async function withDatabase(callback) {
  const connectionString = getConnectionUrl();
  const schema = getSchemaName(connectionString);
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    await client.query(`SET search_path TO ${quoteIdentifier(schema)}`);
    return await callback(client, schema);
  } finally {
    await client.end();
  }
}

function maskConnectionUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.password) parsed.password = '***';
    if (parsed.username) parsed.username = parsed.username.slice(0, 3) + '***';
    return parsed.toString();
  } catch {
    return 'URL invalida ou indisponivel.';
  }
}

function getConnectionDiagnostics() {
  try {
    const url = getConnectionUrl();
    const parsed = new URL(url);

    return {
      source: process.env.AUDIT_DATABASE_URL
        ? 'AUDIT_DATABASE_URL'
        : process.env.DIRECT_URL
          ? 'DIRECT_URL'
          : 'DATABASE_URL',
      host: parsed.hostname,
      schema: getSchemaName(url),
      sslmode: parsed.searchParams.get('sslmode') || 'nao informado',
      maskedUrl: maskConnectionUrl(url),
    };
  } catch (error) {
    return {
      source: 'indisponivel',
      host: 'indisponivel',
      schema: 'indisponivel',
      sslmode: 'indisponivel',
      maskedUrl: error instanceof Error ? error.message : 'indisponivel',
    };
  }
}

function formatDatabaseError(error) {
  if (!error) {
    return 'Erro desconhecido.';
  }

  const diagnostics = getConnectionDiagnostics();
  const parts = [
    error.message,
    error.code ? `codigo=${error.code}` : null,
    error.address ? `host=${error.address}` : null,
    error.port ? `porta=${error.port}` : null,
    `fonte=${diagnostics.source}`,
    `schema=${diagnostics.schema}`,
    `dbHost=${diagnostics.host}`,
  ].filter(Boolean);

  if (error.code === 'EACCES') {
    parts.push('dica=sem permissao de rede/acesso ao banco neste ambiente; rode no PowerShell local com acesso ao Neon');
  }

  return parts.join(' | ') || String(error);
}

module.exports = {
  formatDatabaseError,
  getConnectionUrl,
  getConnectionDiagnostics,
  getSchemaName,
  maskConnectionUrl,
  quoteIdentifier,
  withDatabase,
};
