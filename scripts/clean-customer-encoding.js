const { quoteIdentifier, withDatabase } = require('./database');
const { decodeContactText } = require('./contact-cleaning');

const TEXT_FIELDS = [
  'name',
  'cep',
  'street',
  'number',
  'complement',
  'neighborhood',
  'city',
  'reference',
];

async function main() {
  await withDatabase(async (client) => {
    const fields = TEXT_FIELDS.map(quoteIdentifier).join(', ');
    const result = await client.query(`SELECT "id", ${fields} FROM "Customer"`);
    let updated = 0;

    for (const row of result.rows) {
      const changes = {};

      for (const field of TEXT_FIELDS) {
        const original = row[field];
        const decoded = decodeContactText(original);

        if (typeof original === 'string' && decoded && decoded !== original) {
          changes[field] = decoded;
        }
      }

      const entries = Object.entries(changes);

      if (entries.length === 0) {
        continue;
      }

      const setters = entries
        .map(([field], index) => `${quoteIdentifier(field)} = $${index + 2}`)
        .join(', ');
      const values = [row.id, ...entries.map(([, value]) => value)];

      await client.query(`UPDATE "Customer" SET ${setters} WHERE "id" = $1`, values);
      updated += 1;
    }

    console.log(`Clientes revisados: ${result.rowCount}. Registros corrigidos: ${updated}.`);
  });
}

main().catch((error) => {
  console.error('Falha ao limpar codificacao dos clientes:', error.message);
  process.exit(1);
});
