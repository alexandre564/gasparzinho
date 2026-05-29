const { withDatabase } = require('./database');

const checks = [
  {
    key: 'fiado_sem_cobranca',
    label: 'Pedidos fiados sem cobrança',
    sql: `
      SELECT COUNT(*)::int AS count
      FROM "Order" o
      WHERE o."paymentMethod" = 'FIADO'
        AND NOT EXISTS (SELECT 1 FROM "Debt" d WHERE d."orderId" = o."id")
    `,
  },
  {
    key: 'pedidos_sem_entrega',
    label: 'Pedidos ativos sem entrega',
    sql: `
      SELECT COUNT(*)::int AS count
      FROM "Order" o
      WHERE o."status" IN ('PENDENTE', 'CONFIRMADO', 'ENVIADO', 'EM_PREPARO', 'PRONTO')
        AND NOT EXISTS (SELECT 1 FROM "Delivery" d WHERE d."orderId" = o."id")
    `,
  },
  {
    key: 'cobrancas_vencidas_nao_marcadas',
    label: 'Cobranças vencidas ainda como pendentes',
    sql: `
      SELECT COUNT(*)::int AS count
      FROM "Debt"
      WHERE "status" = 'PENDENTE'
        AND "dueDate" < CURRENT_DATE
    `,
  },
  {
    key: 'estoque_negativo',
    label: 'Produtos com estoque negativo',
    sql: `SELECT COUNT(*)::int AS count FROM "Product" WHERE "inventory" < 0`,
  },
  {
    key: 'clientes_sem_endereco',
    label: 'Clientes sem endereço completo',
    sql: `
      SELECT COUNT(*)::int AS count
      FROM "Customer"
      WHERE COALESCE("street", '') = ''
         OR COALESCE("number", '') = ''
         OR COALESCE("neighborhood", '') = ''
         OR COALESCE("city", '') = ''
    `,
  },
];

async function main() {
  await withDatabase(async (client, schema) => {
    console.log(`Auditoria operacional do Gasparzinho no schema ${schema}`);
    console.log('---------------------------------------------------');

    for (const check of checks) {
      const result = await client.query(check.sql);
      const count = Number(result.rows[0]?.count ?? 0);
      const status = count === 0 ? 'OK' : 'ATENCAO';
      console.log(`${status} | ${check.label}: ${count}`);
    }
  });
}

main().catch((error) => {
  console.error('Falha na auditoria operacional:', error.message);
  process.exit(1);
});
