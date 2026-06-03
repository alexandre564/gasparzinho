const { formatDatabaseError, withDatabase } = require('./database');

const CONFIRM_TOKEN = 'DELETE_TEST_DATA_KEEP_CUSTOMERS';
const DEFAULT_TEST_BRANCH_IDS = ['branch_gasparzinho_teste_norte'];
const PROTECTED_TABLES = ['Customer', 'User', 'Branch', 'Organization', 'Product', 'SystemSetting'];
const DETAIL_LIMIT = Number.parseInt(process.env.TEST_CLEANUP_DETAIL_LIMIT || '50', 10);
const applyChanges = process.argv.includes('--apply');
const confirmToken = process.argv.find((arg) => arg.startsWith('--confirm='))?.split('=')[1] || '';

const markerPattern = /\b(teste|test|e2e|demo|seed|homologacao|homologação)\b/i;

function parseIdList(value) {
  return new Set(
    String(value || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

const explicitIds = {
  Order: parseIdList(process.env.TEST_CLEANUP_ORDER_IDS),
  Expense: parseIdList(process.env.TEST_CLEANUP_EXPENSE_IDS),
  DailyClosing: parseIdList(process.env.TEST_CLEANUP_DAILY_CLOSING_IDS),
  InventoryMovement: parseIdList(process.env.TEST_CLEANUP_INVENTORY_MOVEMENT_IDS),
  ButaneCylinder: parseIdList(process.env.TEST_CLEANUP_BUTANE_CYLINDER_IDS),
  Vehicle: parseIdList(process.env.TEST_CLEANUP_VEHICLE_IDS),
};

const configuredTestBranchIds = new Set([
  ...DEFAULT_TEST_BRANCH_IDS,
  ...String(process.env.TEST_CLEANUP_BRANCH_IDS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean),
]);

function hasMarker(...values) {
  return values.some((value) => typeof value === 'string' && markerPattern.test(value));
}

function asNumber(value) {
  return Number(value || 0);
}

function currency(value) {
  return `R$ ${asNumber(value).toFixed(2).replace('.', ',')}`;
}

function dateOnly(value) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value || '-');
}

function addCandidate(candidates, table, id, criteria, description, extra = {}) {
  candidates.push({ table, id, criteria, description, ...extra });
}

function addManual(manualReview, table, id, reason, description, extra = {}) {
  manualReview.push({ table, id, reason, description, ...extra });
}

async function countProtected(client) {
  const entries = [];

  for (const table of PROTECTED_TABLES) {
    const result = await client.query(`SELECT COUNT(*)::int AS count FROM "${table}"`);
    entries.push([table, Number(result.rows[0]?.count ?? 0)]);
  }

  return Object.fromEntries(entries);
}

async function countOperational(client) {
  const tables = [
    'Order',
    'OrderItem',
    'Delivery',
    'Debt',
    'Expense',
    'DailyClosing',
    'InventoryMovement',
    'ButaneCylinder',
    'Vehicle',
  ];
  const entries = [];

  for (const table of tables) {
    const result = await client.query(`SELECT COUNT(*)::int AS count FROM "${table}"`);
    entries.push([table, Number(result.rows[0]?.count ?? 0)]);
  }

  return Object.fromEntries(entries);
}

async function getTestBranchIds(client) {
  const result = await client.query(`
    SELECT "id", "name", "tradingName", "notes"
    FROM "Branch"
  `);
  const ids = new Set(configuredTestBranchIds);
  const branches = [];

  for (const branch of result.rows) {
    if (configuredTestBranchIds.has(branch.id) || hasMarker(branch.name, branch.tradingName, branch.notes)) {
      ids.add(branch.id);
      branches.push(branch);
    }
  }

  return { ids, branches };
}

async function inspectOrders(client, testBranchIds, candidates, manualReview) {
  const result = await client.query(`
    SELECT
      o."id",
      o."branchId",
      o."status",
      o."paymentMethod",
      o."grossValue",
      o."createdAt",
      c."name" AS "customerName",
      c."phone" AS "customerPhone",
      COUNT(DISTINCT oi."id")::int AS "itemsCount",
      COUNT(DISTINCT d."id")::int AS "debtsCount",
      COUNT(DISTINCT del."id")::int AS "deliveriesCount"
    FROM "Order" o
    JOIN "Customer" c ON c."id" = o."customerId"
    LEFT JOIN "OrderItem" oi ON oi."orderId" = o."id"
    LEFT JOIN "Debt" d ON d."orderId" = o."id"
    LEFT JOIN "Delivery" del ON del."orderId" = o."id"
    GROUP BY o."id", c."name", c."phone"
    ORDER BY o."createdAt" DESC
  `);

  for (const order of result.rows) {
    const description = `${order.customerName} | ${currency(order.grossValue)} | ${order.paymentMethod} | ${dateOnly(order.createdAt)}`;
    const cascade = `cascade: ${order.itemsCount} item(ns), ${order.deliveriesCount} entrega(s), ${order.debtsCount} cobranca(s)`;

    if (explicitIds.Order.has(order.id)) {
      addCandidate(candidates, 'Order', order.id, 'ID informado em TEST_CLEANUP_ORDER_IDS', description, { cascade });
      continue;
    }

    if (testBranchIds.has(order.branchId)) {
      addCandidate(candidates, 'Order', order.id, `filial de teste ${order.branchId}`, description, { cascade });
      continue;
    }

    const isPrismaSeedDemo =
      (order.customerPhone === '35999990001' && order.customerName === 'Maria Aparecida' && asNumber(order.grossValue) === 133) ||
      (order.customerPhone === '35999990002' && order.customerName === 'Joao Pereira' && asNumber(order.grossValue) === 115);

    if (isPrismaSeedDemo) {
      addCandidate(candidates, 'Order', order.id, 'pedido demo identificado exatamente pelo prisma/seed.ts', description, { cascade });
      continue;
    }

    addManual(manualReview, 'Order', order.id, 'pedido sem marcador confiavel; preservar ate revisao humana', description, { cascade });
  }
}

async function inspectExpenses(client, testBranchIds, candidates, manualReview) {
  const result = await client.query(`
    SELECT "id", "branchId", "description", "category", "subCategory", "responsible", "vehicleLabel", "value", "date"
    FROM "Expense"
    ORDER BY "date" DESC, "createdAt" DESC
  `);

  for (const expense of result.rows) {
    const description = `${expense.description} | ${expense.category || '-'} | ${currency(expense.value)} | ${dateOnly(expense.date)}`;

    if (explicitIds.Expense.has(expense.id)) {
      addCandidate(candidates, 'Expense', expense.id, 'ID informado em TEST_CLEANUP_EXPENSE_IDS', description);
    } else if (testBranchIds.has(expense.branchId)) {
      addCandidate(candidates, 'Expense', expense.id, `filial de teste ${expense.branchId}`, description);
    } else if (hasMarker(expense.description, expense.category, expense.subCategory, expense.responsible, expense.vehicleLabel)) {
      addCandidate(candidates, 'Expense', expense.id, 'texto contem marcador de teste/demo/e2e/seed/homologacao', description);
    } else if (expense.description === 'Combustivel para entregas' && expense.category === 'Transporte' && asNumber(expense.value) === 75) {
      addManual(manualReview, 'Expense', expense.id, 'parece despesa demo do prisma/seed.ts, mas e generica; revisar antes de apagar', description);
    } else {
      addManual(manualReview, 'Expense', expense.id, 'gasto sem marcador confiavel; preservar ate revisao humana', description);
    }
  }
}

async function inspectDailyClosings(client, testBranchIds, candidates, manualReview) {
  const result = await client.query(`
    SELECT "id", "branchId", "date", "closedBy", "notes", "totalRevenue", "totalExpenses", "netBalance"
    FROM "DailyClosing"
    ORDER BY "date" DESC, "createdAt" DESC
  `);

  for (const closing of result.rows) {
    const description = `${dateOnly(closing.date)} | receita ${currency(closing.totalRevenue)} | despesas ${currency(closing.totalExpenses)} | saldo ${currency(closing.netBalance)}`;

    if (explicitIds.DailyClosing.has(closing.id)) {
      addCandidate(candidates, 'DailyClosing', closing.id, 'ID informado em TEST_CLEANUP_DAILY_CLOSING_IDS', description);
    } else if (testBranchIds.has(closing.branchId)) {
      addCandidate(candidates, 'DailyClosing', closing.id, `filial de teste ${closing.branchId}`, description);
    } else if (hasMarker(closing.closedBy, closing.notes)) {
      addCandidate(candidates, 'DailyClosing', closing.id, 'texto contem marcador de teste/demo/e2e/seed/homologacao', description);
    } else {
      addManual(manualReview, 'DailyClosing', closing.id, 'fechamento sem marcador confiavel; preservar ate revisao humana', description);
    }
  }
}

async function inspectInventoryMovements(client, testBranchIds, candidates, manualReview) {
  const result = await client.query(`
    SELECT im."id", im."branchId", im."type", im."quantity", im."createdAt", p."name" AS "productName"
    FROM "InventoryMovement" im
    JOIN "Product" p ON p."id" = im."productId"
    ORDER BY im."createdAt" DESC
  `);

  for (const movement of result.rows) {
    const description = `${movement.productName} | ${movement.type} | qtd ${movement.quantity} | ${dateOnly(movement.createdAt)}`;

    if (explicitIds.InventoryMovement.has(movement.id)) {
      addCandidate(candidates, 'InventoryMovement', movement.id, 'ID informado em TEST_CLEANUP_INVENTORY_MOVEMENT_IDS', description);
    } else if (testBranchIds.has(movement.branchId)) {
      addCandidate(candidates, 'InventoryMovement', movement.id, `filial de teste ${movement.branchId}`, description);
    } else {
      addManual(manualReview, 'InventoryMovement', movement.id, 'movimento de estoque sem marcador confiavel; preservar ate revisao humana', description);
    }
  }
}

async function inspectButaneCylinders(client, testBranchIds, candidates, manualReview) {
  const result = await client.query(`
    SELECT bc."id", bc."branchId", bc."status", bc."createdAt", p."name" AS "productName"
    FROM "ButaneCylinder" bc
    JOIN "Product" p ON p."id" = bc."productId"
    ORDER BY bc."createdAt" DESC
  `);

  for (const cylinder of result.rows) {
    const description = `${cylinder.productName} | ${cylinder.status} | ${dateOnly(cylinder.createdAt)}`;

    if (explicitIds.ButaneCylinder.has(cylinder.id)) {
      addCandidate(candidates, 'ButaneCylinder', cylinder.id, 'ID informado em TEST_CLEANUP_BUTANE_CYLINDER_IDS', description);
    } else if (testBranchIds.has(cylinder.branchId)) {
      addCandidate(candidates, 'ButaneCylinder', cylinder.id, `filial de teste ${cylinder.branchId}`, description);
    } else {
      addManual(manualReview, 'ButaneCylinder', cylinder.id, 'botijao sem marcador confiavel; preservar ate revisao humana', description);
    }
  }
}

async function inspectVehicles(client, testBranchIds, candidates, manualReview) {
  const result = await client.query(`
    SELECT "id", "branchId", "placa", "modelo", "tipo", "status", "observacoes"
    FROM "Vehicle"
    ORDER BY "updatedAt" DESC
  `);

  for (const vehicle of result.rows) {
    const description = `${vehicle.placa} | ${vehicle.modelo} | ${vehicle.tipo} | ${vehicle.status}`;

    if (explicitIds.Vehicle.has(vehicle.id)) {
      addCandidate(candidates, 'Vehicle', vehicle.id, 'ID informado em TEST_CLEANUP_VEHICLE_IDS', description);
    } else if (testBranchIds.has(vehicle.branchId)) {
      addCandidate(candidates, 'Vehicle', vehicle.id, `filial de teste ${vehicle.branchId}`, description);
    } else if (hasMarker(vehicle.placa, vehicle.modelo, vehicle.tipo, vehicle.status, vehicle.observacoes)) {
      addCandidate(candidates, 'Vehicle', vehicle.id, 'texto contem marcador de teste/demo/e2e/seed/homologacao', description);
    } else if (vehicle.placa === 'ABC1D23') {
      addManual(manualReview, 'Vehicle', vehicle.id, 'parece veiculo demo do prisma/seed.ts, mas pode ter virado operacional; revisar antes de apagar', description);
    } else {
      addManual(manualReview, 'Vehicle', vehicle.id, 'veiculo sem marcador confiavel; preservar ate revisao humana', description);
    }
  }
}

function groupByTable(items) {
  return items.reduce((acc, item) => {
    acc[item.table] = (acc[item.table] || 0) + 1;
    return acc;
  }, {});
}

function printGroup(title, rows, fields) {
  console.log(`\n${title}: ${rows.length}`);
  if (rows.length === 0) {
    console.log('  - nenhum registro');
    return;
  }

  for (const row of rows.slice(0, DETAIL_LIMIT)) {
    const details = fields.map((field) => `${field}=${row[field] ?? '-'}`).join(' | ');
    console.log(`  - ${details}`);
  }

  if (rows.length > DETAIL_LIMIT) {
    console.log(`  ... ${rows.length - DETAIL_LIMIT} registro(s) oculto(s). Aumente TEST_CLEANUP_DETAIL_LIMIT para ver mais.`);
  }
}

async function deleteByIds(client, table, ids) {
  if (ids.length === 0) return 0;
  const result = await client.query(`DELETE FROM "${table}" WHERE "id" = ANY($1::text[])`, [ids]);
  return result.rowCount;
}

async function applyPlan(client, candidates) {
  if (!applyChanges) return null;

  if (confirmToken !== CONFIRM_TOKEN) {
    throw new Error(`Aplicacao bloqueada. Para aplicar, use --apply --confirm=${CONFIRM_TOKEN}`);
  }

  const idsByTable = candidates.reduce((acc, candidate) => {
    acc[candidate.table] = acc[candidate.table] || [];
    acc[candidate.table].push(candidate.id);
    return acc;
  }, {});

  await client.query('BEGIN');

  try {
    const protectedBefore = await countProtected(client);
    const deleted = {
      ButaneCylinder: await deleteByIds(client, 'ButaneCylinder', idsByTable.ButaneCylinder || []),
      InventoryMovement: await deleteByIds(client, 'InventoryMovement', idsByTable.InventoryMovement || []),
      Vehicle: await deleteByIds(client, 'Vehicle', idsByTable.Vehicle || []),
      Expense: await deleteByIds(client, 'Expense', idsByTable.Expense || []),
      DailyClosing: await deleteByIds(client, 'DailyClosing', idsByTable.DailyClosing || []),
      Order: await deleteByIds(client, 'Order', idsByTable.Order || []),
    };
    const protectedAfter = await countProtected(client);

    for (const table of PROTECTED_TABLES) {
      if (protectedBefore[table] !== protectedAfter[table]) {
        throw new Error(`Protecao acionada: contagem de ${table} mudou de ${protectedBefore[table]} para ${protectedAfter[table]}.`);
      }
    }

    await client.query('COMMIT');
    return deleted;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function main() {
  await withDatabase(async (client, schema) => {
    const protectedCounts = await countProtected(client);
    const operationalCounts = await countOperational(client);
    const { ids: testBranchIds, branches: testBranches } = await getTestBranchIds(client);
    const candidates = [];
    const manualReview = [];

    await inspectOrders(client, testBranchIds, candidates, manualReview);
    await inspectExpenses(client, testBranchIds, candidates, manualReview);
    await inspectDailyClosings(client, testBranchIds, candidates, manualReview);
    await inspectInventoryMovements(client, testBranchIds, candidates, manualReview);
    await inspectButaneCylinders(client, testBranchIds, candidates, manualReview);
    await inspectVehicles(client, testBranchIds, candidates, manualReview);

    const deletionResult = await applyPlan(client, candidates);

    console.log(`Limpeza conservadora de dados de teste no schema ${schema}`);
    console.log('====================================================');
    console.log(`Modo: ${applyChanges ? 'APLICACAO' : 'SIMULACAO'}`);
    console.log('Tabelas protegidas: Customer, User, Branch, Organization, Product, SystemSetting.');
    console.log('Clientes, usuarios, filiais, produtos e configuracoes nunca entram no plano de remocao.');

    console.log('\nContagem protegida atual:');
    for (const [table, count] of Object.entries(protectedCounts)) {
      console.log(`  - ${table}: ${count}`);
    }

    console.log('\nContagem operacional atual:');
    for (const [table, count] of Object.entries(operationalCounts)) {
      console.log(`  - ${table}: ${count}`);
    }

    console.log('\nFiliais consideradas de teste por configuracao/marcador:');
    if (testBranches.length === 0) {
      console.log('  - nenhuma filial de teste encontrada no banco; usando apenas IDs configurados se houver registros.');
    } else {
      for (const branch of testBranches) {
        console.log(`  - ${branch.id} | ${branch.name}${branch.tradingName ? ` / ${branch.tradingName}` : ''}`);
      }
    }

    console.log('\nResumo dos candidatos seguros por tabela:');
    const candidateCounts = groupByTable(candidates);
    if (Object.keys(candidateCounts).length === 0) {
      console.log('  - nenhum candidato seguro encontrado');
    } else {
      for (const [table, count] of Object.entries(candidateCounts)) {
        console.log(`  - ${table}: ${count}`);
      }
    }

    printGroup('Candidatos seguros para remocao', candidates, ['table', 'id', 'criteria', 'description', 'cascade']);
    printGroup('Pendentes de revisao manual / preservados', manualReview, ['table', 'id', 'reason', 'description', 'cascade']);

    if (deletionResult) {
      console.log('\nRemocao aplicada:');
      for (const [table, count] of Object.entries(deletionResult)) {
        console.log(`  - ${table}: ${count}`);
      }
      console.log('Protecao conferida: nenhuma tabela protegida teve contagem alterada.');
    } else {
      console.log('\nNenhuma alteracao foi gravada.');
      console.log(`Para aplicar depois de revisar tudo: node scripts/cleanup-test-data.js --apply --confirm=${CONFIRM_TOKEN}`);
    }
  });
}

main().catch((error) => {
  console.error('Falha na limpeza conservadora de dados de teste:', formatDatabaseError(error));
  process.exit(1);
});
