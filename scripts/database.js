const { Client } = require('pg');
require('dotenv/config');

function getConnectionUrl() {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;

  if (!url) {
    throw new Error('DATABASE_URL ou DIRECT_URL nao foi encontrada.');
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

module.exports = {
  getConnectionUrl,
  getSchemaName,
  quoteIdentifier,
  withDatabase,
};
