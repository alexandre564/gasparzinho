'use server';

import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import type { DebtStatus } from './dividas/types';

const DEBT_ITEMS_PER_PAGE = 10;
const OPEN_DEBT_STATUSES = ['PENDENTE', 'VENCIDO', 'RENEGOCIADO'] as const;

export async function getPaginatedDebts(
  query: string,
  currentPage: number,
  status?: DebtStatus,
) {
  const offset = (currentPage - 1) * DEBT_ITEMS_PER_PAGE;

  const where: Prisma.DebtWhereInput = {
    ...(query ? { customer: { name: { contains: query } } } : {}),
    ...(status ? { status } : { status: { in: [...OPEN_DEBT_STATUSES] } }),
  };

  try {
    const [debts, totalDebts] = await prisma.$transaction([
      prisma.debt.findMany({
        where,
        include: {
          customer: {
            select: { name: true, phone: true },
          },
        },
        orderBy: { dueDate: 'asc' },
        take: DEBT_ITEMS_PER_PAGE,
        skip: offset,
      }),
      prisma.debt.count({ where }),
    ]);

    return {
      debts,
      totalPages: Math.ceil(totalDebts / DEBT_ITEMS_PER_PAGE),
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Falha ao buscar dividas.');
  }
}

export async function getTotalOpenDebt() {
  try {
    const total = await prisma.debt.aggregate({
      _sum: { value: true },
      where: { status: { in: [...OPEN_DEBT_STATUSES] } },
    });

    return {
      totalOpen: total._sum.value ?? 0,
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Falha ao buscar o total de dividas abertas.');
  }
}
