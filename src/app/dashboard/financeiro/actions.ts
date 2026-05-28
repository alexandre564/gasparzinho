'use server';

import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import type { DebtStatus } from './dividas/types';

const DEBT_ITEMS_PER_PAGE = 10;
const OPEN_DEBT_STATUSES = ['PENDENTE', 'VENCIDO', 'RENEGOCIADO'] as const;

function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

export async function getPaginatedDebts(
  query: string,
  currentPage: number,
  status?: DebtStatus,
) {
  const offset = (currentPage - 1) * DEBT_ITEMS_PER_PAGE;

  const trimmedQuery = query.trim();
  const queryDigits = onlyDigits(trimmedQuery);
  const where: Prisma.DebtWhereInput = {
    ...(trimmedQuery
      ? {
          OR: [
            { customer: { name: { contains: trimmedQuery } } },
            { customer: { phone: { contains: trimmedQuery } } },
            { status: { contains: trimmedQuery.toUpperCase() } },
            { notes: { contains: trimmedQuery } },
            ...(queryDigits ? [{ customer: { phone: { contains: queryDigits } } }] : []),
          ],
        }
      : {}),
    ...(status ? { status } : {}),
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
        orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
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
    throw new Error('Falha ao buscar dívidas.');
  }
}

export async function getTotalOpenDebt() {
  try {
    const debts = await prisma.debt.findMany({
      select: { value: true, renegotiatedValue: true },
      where: { status: { in: [...OPEN_DEBT_STATUSES] } },
    });
    const totalOpen = debts.reduce((sum, debt) => sum + (debt.renegotiatedValue ?? debt.value), 0);

    return {
      totalOpen,
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Falha ao buscar o total de dívidas abertas.');
  }
}
