const { formatDatabaseError, quoteIdentifier, withDatabase } = require('./database');

const TABLES = [
  'User',
  'Customer',
  'Product',
  'ButaneCylinder',
  'InventoryMovement',
  'Order',
  'Delivery',
  'Debt',
  'Expense',
  'Vehicle',
  'DailyClosing',
];

async function tableHasColumn(client, tableName, columnName) {
  const result = await client.query(
    `
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = $1 AND column_name = $2
      LIMIT 1
    `,
    [tableName, columnName],
  );

  return result.rowCount > 0;
}

async function countRows(client, tableName, whereSql = '') {
  const result = await client.query(`SELECT COUNT(*)::int AS count FROM ${quoteIdentifier(tableName)} ${whereSql}`);
  return Number(result.rows[0]?.count ?? 0);
}

async function main() {
  if (!process.env.DIRECT_URL && !process.env.DATABASE_URL) {
    console.warn('DATABASE_URL ou DIRECT_URL nao foi encontrada. Pulando auditoria de dados por filial.');
    return;
  }

  await withDatabase(async (client, schema) => {
    console.log(`Auditoria de dados por filial no schema ${schema}`);
    console.log('========================================');

    for (const tableName of TABLES) {
      const hasBranchId = await tableHasColumn(client, tableName, 'branchId');

      if (!hasBranchId) {
        console.log(`- ${tableName}: sem coluna branchId`);
        continue;
      }

      const total = await countRows(client, tableName);
      const withoutBranch = await countRows(client, tableName, 'WHERE "branchId" IS NULL');
      console.log(`- ${tableName}: ${total} registro(s), ${withoutBranch} sem filial`);
    }
  });
}

main().catch((error) => {
  console.warn('Nao foi possivel auditar dados por filial:', formatDatabaseError(error));
});
