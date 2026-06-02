const { formatDatabaseError, getConnectionDiagnostics, withDatabase } = require('./database');

async function main() {
  const diagnostics = getConnectionDiagnostics();

  console.log('Diagnostico de acesso ao banco');
  console.log('==============================');
  console.log(`Fonte: ${diagnostics.source}`);
  console.log(`Host: ${diagnostics.host}`);
  console.log(`Schema: ${diagnostics.schema}`);
  console.log(`SSL mode: ${diagnostics.sslmode}`);
  console.log(`URL: ${diagnostics.maskedUrl}`);

  await withDatabase(async (client, schema) => {
    const result = await client.query('SELECT NOW() AS agora, current_schema() AS schema_atual');
    console.log(`Conexao OK no schema ${schema}.`);
    console.log(`Banco respondeu em: ${result.rows[0]?.agora}`);
    console.log(`Schema atual: ${result.rows[0]?.schema_atual}`);
  });
}

main().catch((error) => {
  console.error('Falha no diagnostico de banco:', formatDatabaseError(error));
  process.exit(1);
});
