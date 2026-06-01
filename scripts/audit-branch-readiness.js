const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const TARGETS = ['src/app/dashboard', 'src/app/api', 'src/lib', 'src/services'];

const OPERATIONAL_PATTERNS = [
  'customer',
  'product',
  'order',
  'delivery',
  'debt',
  'expense',
  'vehicle',
  'dailyClosing',
  'inventoryMovement',
  'butaneCylinder',
];

const GLOBAL_PATTERNS = ['user', 'systemSetting'];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      return walk(fullPath);
    }

    if (!/\.(ts|tsx|js)$/.test(entry.name)) {
      return [];
    }

    return [fullPath];
  });
}

function classifyFile(file) {
  const content = fs.readFileSync(file, 'utf8');

  if (!content.includes('prisma.')) {
    return null;
  }

  const operationalModels = OPERATIONAL_PATTERNS.filter((model) => content.includes(`prisma.${model}`));
  const globalModels = GLOBAL_PATTERNS.filter((model) => content.includes(`prisma.${model}`));
  const relativePath = path.relative(ROOT, file).replace(/\\/g, '/');

  if (operationalModels.length > 0) {
    return {
      path: relativePath,
      scope: 'FILIAL_FUTURA',
      models: operationalModels,
    };
  }

  if (globalModels.length > 0) {
    return {
      path: relativePath,
      scope: 'GLOBAL_OU_ADMIN',
      models: globalModels,
    };
  }

  return {
    path: relativePath,
    scope: 'REVISAR_MANUALMENTE',
    models: [],
  };
}

const results = TARGETS.flatMap((target) => walk(path.join(ROOT, target)))
  .map(classifyFile)
  .filter(Boolean)
  .sort((a, b) => a.scope.localeCompare(b.scope) || a.path.localeCompare(b.path));

const groups = results.reduce((accumulator, item) => {
  accumulator[item.scope] ||= [];
  accumulator[item.scope].push(item);
  return accumulator;
}, {});

console.log('Auditoria de prontidão multifilial');
console.log('====================================');
console.log(`Arquivos com acesso Prisma: ${results.length}`);

for (const [scope, items] of Object.entries(groups)) {
  console.log(`\n${scope}: ${items.length}`);

  for (const item of items) {
    console.log(`- ${item.path}${item.models.length ? ` (${item.models.join(', ')})` : ''}`);
  }
}

if (groups.FILIAL_FUTURA?.length) {
  console.log('\nPróxima ação segura: atualizar estes pontos gradualmente quando branchId existir e os dados antigos já estiverem preenchidos.');
}
