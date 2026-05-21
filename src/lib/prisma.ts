import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function getDatabaseSchema() {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;

  return new URL(url).searchParams.get('schema') ?? undefined;
}

const adapter = new PrismaPg(
  { connectionString: process.env.DATABASE_URL },
  { schema: getDatabaseSchema() }
);

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}