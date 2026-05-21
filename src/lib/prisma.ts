import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const DEFAULT_DATABASE_SCHEMA = 'gasparzinho_v2_dev';

function getDatabaseSchema() {
  const url = process.env.DATABASE_URL;
  if (!url) return DEFAULT_DATABASE_SCHEMA;

  const schema = new URL(url).searchParams.get('schema');

  if (!schema || schema === 'public') {
    return DEFAULT_DATABASE_SCHEMA;
  }

  return schema;
}

const adapter = new PrismaPg(
  { connectionString: process.env.DATABASE_URL },
  { schema: getDatabaseSchema() }
);

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}