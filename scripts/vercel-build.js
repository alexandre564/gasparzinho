const { spawnSync } = require('child_process');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options,
  });

  return result.status ?? 1;
}

const safeSyncStatus = run('npm', ['run', 'db:safe-sync']);

if (safeSyncStatus !== 0) {
  console.warn('db:safe-sync falhou no ambiente de build. Continuando para validar o build da aplicacao.');
}

const buildStatus = run('npm', ['run', 'build']);
process.exit(buildStatus);
