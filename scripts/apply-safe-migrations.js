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

async function main() {
  const connectionString = getConnectionUrl();
  const schema = getSchemaName(connectionString);
  const schemaName = quoteIdentifier(schema);
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);
    await client.query(`SET search_path TO ${schemaName}`);
    await client.query(`
      ALTER TABLE "Order"
      ADD COLUMN IF NOT EXISTS "deliveryAddress" TEXT,
      ADD COLUMN IF NOT EXISTS "deliveryReference" TEXT,
      ADD COLUMN IF NOT EXISTS "deliveryAddressChanged" BOOLEAN NOT NULL DEFAULT false;

      ALTER TABLE "Expense"
      ADD COLUMN IF NOT EXISTS "subCategory" TEXT,
      ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT,
      ADD COLUMN IF NOT EXISTS "responsible" TEXT,
      ADD COLUMN IF NOT EXISTS "vehicleLabel" TEXT;
    `);

    console.log(`Banco atualizado no schema ${schema}.`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('Falha ao atualizar o banco:', error.message);
  process.exit(1);
});
