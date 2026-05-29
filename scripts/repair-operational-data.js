const { withDatabase } = require('./database');

async function main() {
  await withDatabase(async (client, schema) => {
    await client.query('BEGIN');

    try {
      const overdue = await client.query(`
        UPDATE "Debt"
        SET "status" = 'VENCIDO', "updatedAt" = NOW()
        WHERE "status" = 'PENDENTE'
          AND "dueDate" < CURRENT_DATE
      `);

      const missingDeliveries = await client.query(`
        INSERT INTO "Delivery" ("id", "orderId", "status", "createdAt", "updatedAt")
        SELECT
          'repair_delivery_' || o."id",
          o."id",
          'PENDENTE',
          NOW(),
          NOW()
        FROM "Order" o
        WHERE o."status" IN ('PENDENTE', 'CONFIRMADO', 'ENVIADO', 'EM_PREPARO', 'PRONTO')
          AND NOT EXISTS (SELECT 1 FROM "Delivery" d WHERE d."orderId" = o."id")
      `);

      const missingDebts = await client.query(`
        INSERT INTO "Debt" (
          "id",
          "customerId",
          "orderId",
          "value",
          "dueDate",
          "originalDueDate",
          "status",
          "createdAt",
          "updatedAt"
        )
        SELECT
          'repair_debt_' || o."id",
          o."customerId",
          o."id",
          o."grossValue",
          COALESCE(o."paymentDueDate", o."createdAt" + INTERVAL '30 days'),
          COALESCE(o."paymentDueDate", o."createdAt" + INTERVAL '30 days'),
          CASE
            WHEN COALESCE(o."paymentDueDate", o."createdAt" + INTERVAL '30 days') < CURRENT_DATE THEN 'VENCIDO'
            ELSE 'PENDENTE'
          END,
          NOW(),
          NOW()
        FROM "Order" o
        WHERE o."paymentMethod" = 'FIADO'
          AND NOT EXISTS (SELECT 1 FROM "Debt" d WHERE d."orderId" = o."id")
      `);

      await client.query('COMMIT');

      console.log(`Reparo operacional aplicado no schema ${schema}.`);
      console.log(`Cobranças vencidas atualizadas: ${overdue.rowCount}`);
      console.log(`Entregas ausentes criadas: ${missingDeliveries.rowCount}`);
      console.log(`Cobranças ausentes criadas: ${missingDebts.rowCount}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  });
}

main().catch((error) => {
  console.error('Falha no reparo operacional:', error.message);
  process.exit(1);
});
