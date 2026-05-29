'use server';

import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import type { DebtStatus } from './dividas/types';
import { decodeContactText, normalizeSearchText, onlyDigits as getContactDigits } from '@/lib/contact-text';

const DEBT_ITEMS_PER_PAGE = 10;
const OPEN_DEBT_STATUSES = ['PENDENTE', 'VENCIDO', 'RENEGOCIADO'] as const;

function onlyDigits(value: string) {
  return getContactDigits(value);
}

function enhanceDebt<T extends { customer: { name: string; phone: string }; notes?: string | null; status: string; id: string }>(
  debt: T,
) {
  return {
    ...debt,
    customer: {
      ...debt.customer,
      name: decodeContactText(debt.customer.name),
      phone: decodeContactText(debt.customer.phone),
    },
    notes: decodeContactText(debt.notes),
  };
}

function debtMatchesSearch<T extends { customer: { name: string; phone: string }; notes?: string | null; status: string; id: string }>(
  debt: T,
  query: string,
) {
  const term = normalizeSearchText(query);
  const digits = onlyDigits(query);
  const cleanedDebt = enhanceDebt(debt);

  if (!term && !digits) {
    return true;
  }

  const textMatch = [
    cleanedDebt.customer.name,
    cleanedDebt.customer.phone,
    cleanedDebt.status,
    cleanedDebt.notes,
    cleanedDebt.id,
  ]
    .map(normalizeSearchText)
    .some((field) => field.includes(term));
  const phoneMatch = Boolean(digits) && onlyDigits(cleanedDebt.customer.phone).includes(digits);

  return textMatch || phoneMatch;
}

export async function getPaginatedDebts(
  query: string,
  currentPage: number,
  status?: DebtStatus,
) {
  const offset = (currentPage - 1) * DEBT_ITEMS_PER_PAGE;

  const trimmedQuery = query.trim();
  const queryDigits = onlyDigits(trimmedQuery);
  const baseWhere: Prisma.DebtWhereInput = {
    ...(status ? { status } : {}),
  };
  const where: Prisma.DebtWhereInput = {
    ...baseWhere,
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
  };

  try {
    if (trimmedQuery) {
      const debts = await prisma.debt.findMany({
        where: baseWhere,
        include: {
          customer: {
            select: { name: true, phone: true },
          },
        },
        orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
      });
      const filteredDebts = debts
        .filter((debt) => debtMatchesSearch(debt, trimmedQuery))
        .map(enhanceDebt);

      return {
        debts: filteredDebts.slice(offset, offset + DEBT_ITEMS_PER_PAGE),
        totalPages: Math.ceil(filteredDebts.length / DEBT_ITEMS_PER_PAGE),
      };
    }

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
      debts: debts.map(enhanceDebt),
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
