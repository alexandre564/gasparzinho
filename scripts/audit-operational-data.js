const { formatDatabaseError, withDatabase } = require('./database');

const DETAIL_LIMIT = Number.parseInt(process.env.AUDIT_DETAIL_LIMIT || '20', 10);

const checks = [
  {
    key: 'fiado_sem_cobranca',
    label: 'Pedidos fiados sem cobranca',
    severity: 'CRITICO',
    sql: `
      SELECT COUNT(*)::int AS count
      FROM "Order" o
      WHERE o."paymentMethod" = 'FIADO'
        AND o."status" <> 'CANCELADO'
        AND NOT EXISTS (SELECT 1 FROM "Debt" d WHERE d."orderId" = o."id")
    `,
    detailsSql: `
      SELECT o."id", o."branchId", c."name" AS cliente, c."phone" AS telefone,
        o."grossValue" AS valor, o."paymentDueDate"::date AS vencimento, o."createdAt"::date AS criado_em
      FROM "Order" o
      JOIN "Customer" c ON c."id" = o."customerId"
      WHERE o."paymentMethod" = 'FIADO'
        AND o."status" <> 'CANCELADO'
        AND NOT EXISTS (SELECT 1 FROM "Debt" d WHERE d."orderId" = o."id")
      ORDER BY o."createdAt" DESC
      LIMIT $1
    `,
  },
  {
    key: 'pedidos_sem_entrega',
    label: 'Pedidos ativos sem entrega',
    severity: 'CRITICO',
    sql: `
      SELECT COUNT(*)::int AS count
      FROM "Order" o
      WHERE o."status" IN ('PENDENTE', 'CONFIRMADO', 'ENVIADO', 'EM_PREPARO', 'PRONTO')
        AND NOT EXISTS (SELECT 1 FROM "Delivery" d WHERE d."orderId" = o."id")
    `,
    detailsSql: `
      SELECT o."id", o."branchId", c."name" AS cliente, o."status", o."createdAt"::date AS criado_em
      FROM "Order" o
      JOIN "Customer" c ON c."id" = o."customerId"
      WHERE o."status" IN ('PENDENTE', 'CONFIRMADO', 'ENVIADO', 'EM_PREPARO', 'PRONTO')
        AND NOT EXISTS (SELECT 1 FROM "Delivery" d WHERE d."orderId" = o."id")
      ORDER BY o."createdAt" DESC
      LIMIT $1
    `,
  },
  {
    key: 'cobrancas_vencidas_nao_marcadas',
    label: 'Cobrancas vencidas ainda como pendentes',
    severity: 'ALTO',
    sql: `
      SELECT COUNT(*)::int AS count
      FROM "Debt"
      WHERE "status" = 'PENDENTE'
        AND "dueDate" < CURRENT_DATE
    `,
    detailsSql: `
      SELECT d."id", d."branchId", c."name" AS cliente, c."phone" AS telefone,
        d."value" AS valor, d."dueDate"::date AS vencimento,
        (CURRENT_DATE - d."dueDate"::date)::int AS dias_atraso
      FROM "Debt" d
      JOIN "Customer" c ON c."id" = d."customerId"
      WHERE d."status" = 'PENDENTE'
        AND d."dueDate" < CURRENT_DATE
      ORDER BY d."dueDate" ASC
      LIMIT $1
    `,
  },
  {
    key: 'estoque_negativo',
    label: 'Produtos com estoque negativo',
    severity: 'ALTO',
    sql: `SELECT COUNT(*)::int AS count FROM "Product" WHERE "inventory" < 0`,
    detailsSql: `
      SELECT "id", "branchId", "name" AS produto, "inventory" AS estoque
      FROM "Product"
      WHERE "inventory" < 0
      ORDER BY "inventory" ASC
      LIMIT $1
    `,
  },
  {
    key: 'clientes_sem_endereco',
    label: 'Clientes sem endereco completo para entrega',
    severity: 'MEDIO',
    sql: `
      SELECT COUNT(*)::int AS count
      FROM "Customer"
      WHERE COALESCE("street", '') = ''
         OR COALESCE("number", '') = ''
         OR COALESCE("neighborhood", '') = ''
         OR COALESCE("city", '') = ''
    `,
    detailsSql: `
      SELECT "id", "branchId", "name" AS cliente, "phone" AS telefone,
        CONCAT_WS(', ',
          CASE WHEN COALESCE("street", '') = '' THEN 'rua' END,
          CASE WHEN COALESCE("number", '') = '' THEN 'numero' END,
          CASE WHEN COALESCE("neighborhood", '') = '' THEN 'bairro' END,
          CASE WHEN COALESCE("city", '') = '' THEN 'cidade' END,
          CASE WHEN COALESCE("cep", '') = '' THEN 'cep' END
        ) AS campos_faltando
      FROM "Customer"
      WHERE COALESCE("street", '') = ''
         OR COALESCE("number", '') = ''
         OR COALESCE("neighborhood", '') = ''
         OR COALESCE("city", '') = ''
      ORDER BY "updatedAt" DESC
      LIMIT $1
    `,
  },
  {
    key: 'clientes_codificacao_suspeita',
    label: 'Clientes com codificacao importada suspeita',
    severity: 'MEDIO',
    sql: `
      SELECT COUNT(*)::int AS count
      FROM "Customer"
      WHERE "name" ~ '(=[0-9A-Fa-f]{2}){2,}'
         OR "street" ~ '(=[0-9A-Fa-f]{2}){2,}'
         OR "reference" ~ '(=[0-9A-Fa-f]{2}){2,}'
         OR "name" ILIKE '%BEGIN:VCARD%'
         OR "name" ILIKE '%END:VCARD%'
    `,
    detailsSql: `
      SELECT "id", "branchId", "name" AS cliente, "phone" AS telefone
      FROM "Customer"
      WHERE "name" ~ '(=[0-9A-Fa-f]{2}){2,}'
         OR "street" ~ '(=[0-9A-Fa-f]{2}){2,}'
         OR "reference" ~ '(=[0-9A-Fa-f]{2}){2,}'
         OR "name" ILIKE '%BEGIN:VCARD%'
         OR "name" ILIKE '%END:VCARD%'
      ORDER BY "updatedAt" DESC
      LIMIT $1
    `,
  },
  {
    key: 'telefones_duplicados',
    label: 'Telefones duplicados por digitos',
    severity: 'MEDIO',
    sql: `
      SELECT COUNT(*)::int AS count
      FROM (
        SELECT branch_id, digits
        FROM (
          SELECT
            COALESCE("branchId", 'sem-filial') AS branch_id,
            REGEXP_REPLACE("phone", '\\D', '', 'g') AS digits
          FROM "Customer"
        ) cleaned
        WHERE LENGTH(digits) >= 8
        GROUP BY branch_id, digits
        HAVING COUNT(*) > 1
      ) duplicates
    `,
    detailsSql: `
      SELECT branch_id AS "branchId", digits AS telefone, total
      FROM (
        SELECT branch_id, digits, COUNT(*)::int AS total
        FROM (
          SELECT COALESCE("branchId", 'sem-filial') AS branch_id, REGEXP_REPLACE("phone", '\\D', '', 'g') AS digits
          FROM "Customer"
        ) cleaned
        WHERE LENGTH(digits) >= 8
        GROUP BY branch_id, digits
        HAVING COUNT(*) > 1
      ) duplicates
      ORDER BY total DESC
      LIMIT $1
    `,
  },
  {
    key: 'pedidos_sem_endereco_entrega',
    label: 'Pedidos sem endereco de entrega registrado',
    severity: 'ALTO',
    sql: `
      SELECT COUNT(*)::int AS count
      FROM "Order" o
      WHERE o."status" <> 'CANCELADO'
        AND COALESCE(o."deliveryAddress", '') = ''
    `,
    detailsSql: `
      SELECT o."id", o."branchId", c."name" AS cliente, c."phone" AS telefone,
        CONCAT_WS(' - ',
          NULLIF(CONCAT_WS(', ', NULLIF(c."street", ''), NULLIF(c."number", '')), ''),
          NULLIF(c."neighborhood", ''),
          NULLIF(c."city", ''),
          CASE WHEN COALESCE(c."cep", '') <> '' THEN 'CEP ' || c."cep" END
        ) AS endereco_cliente,
        o."createdAt"::date AS criado_em
      FROM "Order" o
      JOIN "Customer" c ON c."id" = o."customerId"
      WHERE o."status" <> 'CANCELADO'
        AND COALESCE(o."deliveryAddress", '') = ''
      ORDER BY o."createdAt" DESC
      LIMIT $1
    `,
  },
  {
    key: 'usuarios_perfil_invalido',
    label: 'Usuarios com perfil invalido',
    severity: 'ALTO',
    sql: `
      SELECT COUNT(*)::int AS count
      FROM "User"
      WHERE UPPER(COALESCE("role", '')) NOT IN ('ADMIN', 'VENDEDOR', 'ENTREGADOR')
    `,
    detailsSql: `
      SELECT "id", "name" AS usuario, "email", "role", "branchId", "organizationId"
      FROM "User"
      WHERE UPPER(COALESCE("role", '')) NOT IN ('ADMIN', 'VENDEDOR', 'ENTREGADOR')
      ORDER BY "updatedAt" DESC
      LIMIT $1
    `,
  },
];

const addressBreakdownSql = `
  SELECT
    SUM(CASE WHEN COALESCE("street", '') = '' THEN 1 ELSE 0 END)::int AS rua,
    SUM(CASE WHEN COALESCE("number", '') = '' THEN 1 ELSE 0 END)::int AS numero,
    SUM(CASE WHEN COALESCE("neighborhood", '') = '' THEN 1 ELSE 0 END)::int AS bairro,
    SUM(CASE WHEN COALESCE("city", '') = '' THEN 1 ELSE 0 END)::int AS cidade,
    SUM(CASE WHEN COALESCE("cep", '') = '' THEN 1 ELSE 0 END)::int AS cep
  FROM "Customer"
`;

function formatValue(value) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (value === null || value === undefined || value === '') {
    return '-';
  }

  return String(value).replace(/\s+/g, ' ').trim();
}

function printRows(rows) {
  if (!rows.length) return;

  for (const row of rows) {
    const line = Object.entries(row)
      .map(([key, value]) => `${key}=${formatValue(value)}`)
      .join(' | ');
    console.log(`    - ${line}`);
  }
}

async function printDetails(client, check, count) {
  if (count === 0 || !check.detailsSql) return;

  const result = await client.query(check.detailsSql, [DETAIL_LIMIT]);
  console.log(`  Detalhes (${Math.min(count, DETAIL_LIMIT)} de ${count}):`);
  printRows(result.rows);
}

async function main() {
  await withDatabase(async (client, schema) => {
    let warnings = 0;

    console.log(`Auditoria operacional do Gasparzinho no schema ${schema}`);
    console.log('---------------------------------------------------');

    for (const check of checks) {
      const result = await client.query(check.sql);
      const count = Number(result.rows[0]?.count ?? 0);
      const status = count === 0 ? 'OK' : `ATENCAO/${check.severity}`;
      if (count > 0) warnings += 1;
      console.log(`${status} | ${check.label}: ${count}`);
      await printDetails(client, check, count);
    }

    const addressBreakdown = await client.query(addressBreakdownSql);
    console.log('\nCampos de endereco faltando em clientes:');
    printRows(addressBreakdown.rows);

    console.log('\nResultado:');
    console.log(
      warnings === 0
        ? 'Nenhum ponto operacional critico encontrado.'
        : `${warnings} grupo(s) exigem saneamento ou acompanhamento operacional.`,
    );
    console.log('Use AUDIT_DETAIL_LIMIT=50 para ampliar as amostras. Rode data:repair sem --apply para simular reparos seguros.');
  });
}

main().catch((error) => {
  console.error('Falha na auditoria operacional:', formatDatabaseError(error));
  process.exit(1);
});
