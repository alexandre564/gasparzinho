const { formatDatabaseError, quoteIdentifier, withDatabase } = require('./database');

const DETAIL_LIMIT = Number.parseInt(process.env.AUDIT_DETAIL_LIMIT || '20', 10);

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

async function branchDistribution(client, tableName) {
  return client.query(`
    SELECT COALESCE("branchId", 'sem-filial') AS filial, COUNT(*)::int AS total
    FROM ${quoteIdentifier(tableName)}
    GROUP BY COALESCE("branchId", 'sem-filial')
    ORDER BY total DESC, filial ASC
    LIMIT $1
  `, [DETAIL_LIMIT]);
}

async function main() {
  if (!process.env.DIRECT_URL && !process.env.DATABASE_URL) {
    console.warn('DATABASE_URL ou DIRECT_URL nao foi encontrada. Pulando auditoria de dados por filial.');
    return;
  }

  await withDatabase(async (client, schema) => {
    let tablesWithMissingBranch = 0;

    console.log(`Auditoria de dados por filial no schema ${schema}`);
    console.log('========================================');

    for (const tableName of TABLES) {
      const quotedTable = quoteIdentifier(tableName);
      const hasBranchId = await tableHasColumn(client, tableName, 'branchId');

      if (!hasBranchId) {
        console.log(`- ${tableName}: sem coluna branchId`);
        continue;
      }

      const total = await countRows(client, tableName);
      const withoutBranch = await countRows(client, tableName, 'WHERE "branchId" IS NULL');
      const status = withoutBranch === 0 ? 'OK' : 'ATENCAO';
      console.log(`- ${status} ${tableName}: ${total} registro(s), ${withoutBranch} sem filial`);

      if (withoutBranch > 0) {
        tablesWithMissingBranch += 1;
        const details = await client.query(`
          SELECT "id", "createdAt"::date AS criado_em
          FROM ${quotedTable}
          WHERE "branchId" IS NULL
          ORDER BY "createdAt" DESC
          LIMIT $1
        `, [DETAIL_LIMIT]);

        for (const row of details.rows) {
          console.log(`    - id=${row.id} | criado_em=${row.criado_em}`);
        }
      }

      const distribution = await branchDistribution(client, tableName);
      const summary = distribution.rows.map((row) => `${row.filial}:${row.total}`).join(', ');
      console.log(`    distribuicao: ${summary || 'sem registros'}`);
    }

    console.log('\nResultado:');
    console.log(
      tablesWithMissingBranch === 0
        ? 'Nenhum registro operacional sem filial encontrado.'
        : `${tablesWithMissingBranch} tabela(s) ainda possuem registros sem filial.`,
    );
  });
}

main().catch((error) => {
  console.warn('Nao foi possivel auditar dados por filial:', formatDatabaseError(error));
  process.exitCode = 1;
});
