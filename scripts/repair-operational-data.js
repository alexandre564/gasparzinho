const { formatDatabaseError, quoteIdentifier, withDatabase } = require('./database');
const { decodeContactText, phoneDigits } = require('./contact-cleaning');

const CUSTOMER_TEXT_FIELDS = [
  'name',
  'cep',
  'street',
  'number',
  'complement',
  'neighborhood',
  'city',
  'reference',
];

async function cleanCustomerEncoding(client) {
  const fields = CUSTOMER_TEXT_FIELDS.map(quoteIdentifier).join(', ');
  const result = await client.query(`SELECT "id", ${fields} FROM "Customer"`);
  let updated = 0;

  for (const row of result.rows) {
    const changes = {};

    for (const field of CUSTOMER_TEXT_FIELDS) {
      const original = row[field];
      const decoded = decodeContactText(original);

      if (typeof original === 'string' && decoded && decoded !== original) {
        changes[field] = decoded;
      }
    }

    const entries = Object.entries(changes);

    if (entries.length === 0) {
      continue;
    }

    const setters = entries
      .map(([field], index) => `${quoteIdentifier(field)} = $${index + 2}`)
      .join(', ');
    const values = [row.id, ...entries.map(([, value]) => value)];

    await client.query(`UPDATE "Customer" SET ${setters}, "updatedAt" = NOW() WHERE "id" = $1`, values);
    updated += 1;
  }

  return updated;
}

async function mergeDuplicateCustomers(client) {
  const result = await client.query(`
    SELECT c."id", c."phone", c."createdAt",
      (SELECT COUNT(*)::int FROM "Order" o WHERE o."customerId" = c."id") AS orders_count,
      (SELECT COUNT(*)::int FROM "Debt" d WHERE d."customerId" = c."id") AS debts_count
    FROM "Customer" c
  `);
  const groups = new Map();

  for (const row of result.rows) {
    const digits = phoneDigits(row.phone);

    if (digits.length < 8) {
      continue;
    }

    if (!groups.has(digits)) {
      groups.set(digits, []);
    }

    groups.get(digits).push(row);
  }

  let merged = 0;

  for (const rows of groups.values()) {
    if (rows.length < 2) {
      continue;
    }

    const [canonical, ...duplicates] = rows.sort((left, right) => {
      const leftScore = Number(left.orders_count) + Number(left.debts_count);
      const rightScore = Number(right.orders_count) + Number(right.debts_count);

      if (leftScore !== rightScore) {
        return rightScore - leftScore;
      }

      return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
    });

    for (const duplicate of duplicates) {
      await client.query(`UPDATE "Order" SET "customerId" = $1 WHERE "customerId" = $2`, [canonical.id, duplicate.id]);
      await client.query(`UPDATE "Debt" SET "customerId" = $1 WHERE "customerId" = $2`, [canonical.id, duplicate.id]);
      await client.query(`DELETE FROM "Customer" WHERE "id" = $1`, [duplicate.id]);
      merged += 1;
    }
  }

  return merged;
}

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

      const missingDeliveryAddresses = await client.query(`
        UPDATE "Order" o
        SET
          "deliveryAddress" = CONCAT_WS(
            ' - ',
            NULLIF(CONCAT_WS(', ', NULLIF(c."street", ''), NULLIF(c."number", '')), ''),
            NULLIF(c."complement", ''),
            NULLIF(c."neighborhood", ''),
            NULLIF(c."city", ''),
            CASE WHEN COALESCE(c."cep", '') <> '' THEN 'CEP ' || c."cep" ELSE NULL END
          ),
          "deliveryReference" = COALESCE(o."deliveryReference", c."reference"),
          "updatedAt" = NOW()
        FROM "Customer" c
        WHERE o."customerId" = c."id"
          AND o."status" <> 'CANCELADO'
          AND COALESCE(o."deliveryAddress", '') = ''
      `);
      const cleanedCustomers = await cleanCustomerEncoding(client);
      const mergedCustomers = await mergeDuplicateCustomers(client);

      await client.query('COMMIT');

      console.log(`Reparo operacional aplicado no schema ${schema}.`);
      console.log(`Cobranças vencidas atualizadas: ${overdue.rowCount}`);
      console.log(`Entregas ausentes criadas: ${missingDeliveries.rowCount}`);
      console.log(`Cobranças ausentes criadas: ${missingDebts.rowCount}`);
      console.log(`Pedidos com endereco de entrega reparado: ${missingDeliveryAddresses.rowCount}`);
      console.log(`Clientes com codificacao corrigida: ${cleanedCustomers}`);
      console.log(`Clientes duplicados mesclados por telefone: ${mergedCustomers}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  });
}

main().catch((error) => {
  console.error('Falha no reparo operacional:', formatDatabaseError(error));
  process.exit(1);
});
