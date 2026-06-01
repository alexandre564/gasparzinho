const { randomUUID } = require('crypto');
const { quoteIdentifier, withDatabase } = require('./database');

const DEFAULT_ORGANIZATION_ID = 'org_gas_default';
const DEFAULT_BRANCH_ID = 'branch_gasparzinho_default';
const DEFAULT_BRANCH_NAME = 'Gás Gasparzinho';

async function main() {
  if (!process.env.DIRECT_URL && !process.env.DATABASE_URL) {
    console.warn('DATABASE_URL ou DIRECT_URL nao foi encontrada. Pulando criacao da filial padrao.');
    return;
  }

  await withDatabase(async (client, schema) => {
    await client.query(`SET search_path TO ${quoteIdentifier(schema)}`);

    await client.query(
      `
        INSERT INTO "Organization" ("id", "name", "status", "notes", "createdAt", "updatedAt")
        VALUES ($1, $2, 'ATIVA', $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT ("id") DO UPDATE
          SET "name" = EXCLUDED."name",
              "status" = EXCLUDED."status",
              "updatedAt" = CURRENT_TIMESTAMP
      `,
      [DEFAULT_ORGANIZATION_ID, 'Gas', 'Organizacao padrao criada para evolucao multifilial.'],
    );

    await client.query(
      `
        INSERT INTO "Branch" (
          "id",
          "organizationId",
          "name",
          "tradingName",
          "city",
          "status",
          "contractStatus",
          "notes",
          "createdAt",
          "updatedAt"
        )
        VALUES ($1, $2, $3, $4, $5, 'ATIVA', 'PROPRIA', $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT ("id") DO UPDATE
          SET "name" = EXCLUDED."name",
              "tradingName" = EXCLUDED."tradingName",
              "city" = EXCLUDED."city",
              "status" = EXCLUDED."status",
              "contractStatus" = EXCLUDED."contractStatus",
              "updatedAt" = CURRENT_TIMESTAMP
      `,
      [
        DEFAULT_BRANCH_ID,
        DEFAULT_ORGANIZATION_ID,
        DEFAULT_BRANCH_NAME,
        DEFAULT_BRANCH_NAME,
        'Lavras',
        'Filial padrao para os dados existentes antes do isolamento por branchId.',
      ],
    );

    await client.query(
      `
        INSERT INTO "SystemSetting" ("id", "key", "value", "createdAt", "updatedAt")
        VALUES ($1, 'defaultBranchName', $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT ("key") DO NOTHING
      `,
      [randomUUID(), DEFAULT_BRANCH_NAME],
    );

    console.log(`Organizacao e filial padrao conferidas no schema ${schema}.`);
  });
}

main().catch((error) => {
  console.error('Falha ao criar filial padrao:', error.message);
  process.exit(1);
});
