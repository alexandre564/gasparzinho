const { quoteIdentifier, withDatabase } = require('./database');

async function main() {
  await withDatabase(async (client, schema) => {
    const schemaName = quoteIdentifier(schema);

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
  });
}

main().catch((error) => {
  console.error('Falha ao atualizar o banco:', error.message);
  process.exit(1);
});
