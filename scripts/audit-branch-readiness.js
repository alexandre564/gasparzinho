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

const GLOBAL_PATTERNS = ['user', 'systemSetting', 'organization', 'branch'];

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

function hasBranchScope(content) {
  return (
    content.includes('buildBranchWhere(') ||
    content.includes('getCurrentBranchWhere(') ||
    content.includes('branchScope.branchId') ||
    content.includes('branchId:')
  );
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
      scope: hasBranchScope(content) ? 'FILIAL_COM_ESCOPO' : 'FILIAL_REVISAR',
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

console.log('Auditoria de prontidao multifilial');
console.log('====================================');
console.log(`Arquivos com acesso Prisma: ${results.length}`);

for (const [scope, items] of Object.entries(groups)) {
  console.log(`\n${scope}: ${items.length}`);

  for (const item of items) {
    console.log(`- ${item.path}${item.models.length ? ` (${item.models.join(', ')})` : ''}`);
  }
}

if (groups.FILIAL_REVISAR?.length) {
  console.log('\nResultado: revisar os arquivos FILIAL_REVISAR antes de tornar branchId obrigatorio.');
  process.exitCode = 1;
} else {
  console.log('\nResultado: todos os acessos operacionais Prisma encontrados usam algum mecanismo de escopo por filial.');
}
