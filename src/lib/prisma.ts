import { PrismaClient } from '@prisma/client';

// Previne múltiplas instâncias do PrismaClient em ambiente de desenvolvimento.
declare global {
  // Permite que `globalThis` seja usado para armazenar o `prisma`.
  var prisma: PrismaClient | undefined;
}

export const prisma = globalThis.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}
