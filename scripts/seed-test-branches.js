const bcrypt = require('bcryptjs');
const { formatDatabaseError, withDatabase } = require('./database');

const DEFAULT_ORGANIZATION_ID = 'org_gas_default';
const TEST_BRANCH_ID = 'branch_gasparzinho_teste_norte';
const TEST_PASSWORD = process.env.TEST_BRANCH_PASSWORD || 'teste123';
const shouldApply = process.argv.includes('--apply') || process.env.SEED_TEST_BRANCHES_APPLY === '1';

async function upsertUser(client, user) {
  await client.query(
    `
      INSERT INTO "User" (
        "id", "name", "email", "password", "role", "accessLevel",
        "organizationId", "branchId", "isActive", "createdAt", "updatedAt"
      )
      VALUES ($1, $2, $3, $4, $5, 'USER', $6, $7, true, NOW(), NOW())
      ON CONFLICT ("email") DO UPDATE
        SET "name" = EXCLUDED."name",
            "password" = EXCLUDED."password",
            "role" = EXCLUDED."role",
            "organizationId" = EXCLUDED."organizationId",
            "branchId" = EXCLUDED."branchId",
            "isActive" = true,
            "updatedAt" = NOW()
    `,
    [
      user.id,
      user.name,
      user.email,
      user.password,
      user.role,
      DEFAULT_ORGANIZATION_ID,
      user.branchId,
    ],
  );
}

async function main() {
  await withDatabase(async (client, schema) => {
    const password = await bcrypt.hash(TEST_PASSWORD, 10);

    await client.query('BEGIN');
    try {
      await client.query(
        `
          INSERT INTO "Organization" ("id", "name", "status", "notes", "createdAt", "updatedAt")
          VALUES ($1, 'Gas', 'ATIVA', 'Organizacao principal para testes multifiliais.', NOW(), NOW())
          ON CONFLICT ("id") DO UPDATE
            SET "name" = EXCLUDED."name",
                "status" = EXCLUDED."status",
                "updatedAt" = NOW()
        `,
        [DEFAULT_ORGANIZATION_ID],
      );

      await client.query(
        `
          INSERT INTO "Branch" (
            "id", "organizationId", "name", "tradingName", "city", "status",
            "contractStatus", "planName", "notes", "createdAt", "updatedAt"
          )
          VALUES ($1, $2, 'Gas Gasparzinho Teste Norte', 'Teste Norte', 'Lavras',
            'ATIVA', 'TESTE', 'Homologacao', $3, NOW(), NOW())
          ON CONFLICT ("id") DO UPDATE
            SET "name" = EXCLUDED."name",
                "tradingName" = EXCLUDED."tradingName",
                "city" = EXCLUDED."city",
                "status" = EXCLUDED."status",
                "contractStatus" = EXCLUDED."contractStatus",
                "planName" = EXCLUDED."planName",
                "updatedAt" = NOW()
        `,
        [
          TEST_BRANCH_ID,
          DEFAULT_ORGANIZATION_ID,
          'Filial segura para teste de isolamento. Pode ser pausada depois da homologacao.',
        ],
      );

      await upsertUser(client, {
        id: 'user_teste_norte_vendedor',
        name: 'Vendedor Teste Norte',
        email: 'vendedor-norte@gasparzinho.com',
        role: 'VENDEDOR',
        password,
        branchId: TEST_BRANCH_ID,
      });

      await upsertUser(client, {
        id: 'user_teste_norte_entregador',
        name: 'Entregador Teste Norte',
        email: 'entregador-norte@gasparzinho.com',
        role: 'ENTREGADOR',
        password,
        branchId: TEST_BRANCH_ID,
      });

      if (shouldApply) {
        await client.query('COMMIT');
      } else {
        await client.query('ROLLBACK');
      }

      console.log(`Cenario de segunda filial ${shouldApply ? 'criado' : 'simulado'} no schema ${schema}.`);
      console.log(`Filial: ${TEST_BRANCH_ID}`);
      console.log('Usuarios de teste:');
      console.log(`- vendedor-norte@gasparzinho.com / ${TEST_PASSWORD}`);
      console.log(`- entregador-norte@gasparzinho.com / ${TEST_PASSWORD}`);
      if (!shouldApply) {
        console.log('Nenhuma alteracao foi gravada. Para aplicar, rode: npm run branches:seed-test:apply');
      }
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  });
}

main().catch((error) => {
  console.error('Falha ao criar cenario multifilial de teste:', formatDatabaseError(error));
  process.exit(1);
});
