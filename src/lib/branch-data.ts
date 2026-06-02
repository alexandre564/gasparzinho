import { prisma } from '@/lib/prisma';

export type BranchOverview = {
  setupAvailable: boolean;
  organizations: Array<{
    id: string;
    name: string;
    status: string;
    branches: Array<{
      id: string;
      name: string;
      tradingName: string | null;
      document: string | null;
      phone: string | null;
      city: string | null;
      status: string;
      contractStatus: string;
      planName: string | null;
      contractDueAt: Date | null;
      notes: string | null;
    }>;
  }>;
  error?: string;
};

export async function getBranchOverview(): Promise<BranchOverview> {
  try {
    const organizations = await prisma.organization.findMany({
      orderBy: { name: 'asc' },
      include: {
        branches: {
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            tradingName: true,
            document: true,
            phone: true,
            city: true,
            status: true,
            contractStatus: true,
            planName: true,
            contractDueAt: true,
            notes: true,
          },
        },
      },
    });

    return {
      setupAvailable: true,
      organizations,
    };
  } catch (error) {
    return {
      setupAvailable: false,
      organizations: [],
      error: error instanceof Error ? error.message : 'Não foi possível ler a base de filiais.',
    };
  }
}
