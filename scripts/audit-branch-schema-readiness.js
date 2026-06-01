const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const schemaPath = path.join(ROOT, 'prisma', 'schema.prisma');

const REQUIRED_FOUNDATION_MODELS = ['Organization', 'Branch'];
const FUTURE_BRANCH_MODELS = [
  'User',
  'Customer',
  'Product',
  'InventoryMovement',
  'ButaneCylinder',
  'Order',
  'Delivery',
  'Debt',
  'Expense',
  'Vehicle',
  'DailyClosing',
];

function getModelBlock(schema, modelName) {
  const match = schema.match(new RegExp(`model\\s+${modelName}\\s+\\{([\\s\\S]*?)\\n\\}`, 'm'));
  return match?.[1] ?? '';
}

const schema = fs.readFileSync(schemaPath, 'utf8');

const foundation = REQUIRED_FOUNDATION_MODELS.map((modelName) => ({
  modelName,
  exists: Boolean(getModelBlock(schema, modelName)),
}));

const operational = FUTURE_BRANCH_MODELS.map((modelName) => {
  const block = getModelBlock(schema, modelName);

  return {
    modelName,
    exists: Boolean(block),
    hasBranchId: /\bbranchId\b/.test(block),
    hasOrganizationId: /\borganizationId\b/.test(block),
  };
});

console.log('Auditoria de schema multifilial');
console.log('================================');

for (const item of foundation) {
  console.log(`${item.exists ? 'OK' : 'FALTA'} base: ${item.modelName}`);
}

console.log('\nModelos operacionais:');
for (const item of operational) {
  if (!item.exists) {
    console.log(`FALTA modelo: ${item.modelName}`);
    continue;
  }

  const scope = item.hasBranchId ? 'com branchId' : 'sem branchId ainda';
  const organization = item.hasOrganizationId ? ', com organizationId' : '';
  console.log(`- ${item.modelName}: ${scope}${organization}`);
}

const missingBranchScope = operational.filter((item) => item.exists && !item.hasBranchId);

console.log('\nResultado:');
if (foundation.every((item) => item.exists) && missingBranchScope.length > 0) {
  console.log('Base pronta e dados operacionais ainda preservados sem branchId obrigatório.');
  console.log('Proximo passo seguro: manter branchId opcional ate a validacao de producao e conferir preenchimento por filial nos dados importados.');
} else if (missingBranchScope.length === 0) {
  console.log('Todos os modelos operacionais já possuem branchId. Validar preenchimento dos dados antigos antes de tornar obrigatório.');
} else {
  console.log('Base multifilial incompleta. Revisar schema antes de avançar.');
}
