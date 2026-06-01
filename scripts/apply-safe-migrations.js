const { quoteIdentifier, withDatabase } = require('./database');

async function main() {
  if (!process.env.DIRECT_URL && !process.env.DATABASE_URL) {
    console.warn(
      'DATABASE_URL ou DIRECT_URL nao foi encontrada. Pulando db:safe-sync; o build continuara sem alterar o banco.',
    );
    return;
  }

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

      CREATE TABLE IF NOT EXISTS "Organization" (
        "id" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "document" TEXT,
        "status" TEXT NOT NULL DEFAULT 'ATIVA',
        "notes" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
      );

      CREATE TABLE IF NOT EXISTS "Branch" (
        "id" TEXT NOT NULL,
        "organizationId" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "tradingName" TEXT,
        "document" TEXT,
        "phone" TEXT,
        "city" TEXT,
        "status" TEXT NOT NULL DEFAULT 'ATIVA',
        "contractStatus" TEXT NOT NULL DEFAULT 'PROPRIA',
        "planName" TEXT,
        "contractDueAt" TIMESTAMP(3),
        "notes" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
      );

      CREATE INDEX IF NOT EXISTS "Organization_status_idx" ON "Organization"("status");
      CREATE INDEX IF NOT EXISTS "Branch_organizationId_idx" ON "Branch"("organizationId");
      CREATE INDEX IF NOT EXISTS "Branch_status_idx" ON "Branch"("status");
      CREATE INDEX IF NOT EXISTS "Branch_contractStatus_idx" ON "Branch"("contractStatus");

      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'Branch_organizationId_fkey'
        ) THEN
          ALTER TABLE "Branch"
            ADD CONSTRAINT "Branch_organizationId_fkey"
            FOREIGN KEY ("organizationId")
            REFERENCES "Organization"("id")
            ON DELETE CASCADE
            ON UPDATE CASCADE;
        END IF;
      END $$;
    `);

    console.log(`Banco atualizado no schema ${schema}.`);
  });
}

main().catch((error) => {
  console.error('Falha ao atualizar o banco:', error.message);
  process.exit(1);
});
