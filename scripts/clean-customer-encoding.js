const { Client } = require('pg');
require('dotenv/config');

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

function getConnectionUrl() {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;

  if (!url) {
    throw new Error('DATABASE_URL ou DIRECT_URL nao foi encontrada.');
  }

  return url;
}

function getSchemaName(url) {
  const parsed = new URL(url);
  return parsed.searchParams.get('schema') || 'public';
}

function quoteIdentifier(value) {
  return `"${value.replace(/"/g, '""')}"`;
}

function decodeQuotedPrintable(value) {
  const withoutSoftBreaks = value.replace(/=\r?\n/g, '');
  const bytes = [];
  let output = '';

  for (let index = 0; index < withoutSoftBreaks.length; index += 1) {
    const char = withoutSoftBreaks[index];
    const hex = withoutSoftBreaks.slice(index + 1, index + 3);

    if (char === '=' && /^[0-9A-Fa-f]{2}$/.test(hex)) {
      bytes.push(Number.parseInt(hex, 16));
      index += 2;
      continue;
    }

    if (bytes.length > 0) {
      output += Buffer.from(bytes).toString('utf8');
      bytes.length = 0;
    }

    output += char;
  }

  if (bytes.length > 0) {
    output += Buffer.from(bytes).toString('utf8');
  }

  return output;
}

function decodeRfc2047Words(value) {
  return value.replace(/=\?([^?]+)\?([QB])\?([^?]+)\?=/gi, (_match, _charset, encoding, encoded) => {
    if (String(encoding).toUpperCase() === 'Q') {
      return decodeQuotedPrintable(String(encoded).replace(/_/g, ' '));
    }

    try {
      return Buffer.from(String(encoded), 'base64').toString('utf8');
    } catch {
      return String(encoded);
    }
  });
}

function looksQuotedPrintable(value) {
  return /(?:=[0-9A-Fa-f]{2}){2,}/.test(value) || /=\r?\n/.test(value);
}

function decodeContactText(value) {
  if (typeof value !== 'string' || value.length === 0) {
    return value;
  }

  const trimmed = value.replace(/^"+|"+$/g, '').trim();
  const rfcDecoded = decodeRfc2047Words(trimmed);
  const decoded = looksQuotedPrintable(rfcDecoded) ? decodeQuotedPrintable(rfcDecoded) : rfcDecoded;

  return decoded
    .replace(/\\n/gi, ' ')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  const connectionString = getConnectionUrl();
  const schema = getSchemaName(connectionString);
  const schemaName = quoteIdentifier(schema);
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    await client.query(`SET search_path TO ${schemaName}`);
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
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('Falha ao limpar codificacao dos clientes:', error.message);
  process.exit(1);
});
