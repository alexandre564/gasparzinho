'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import type { DebtStatus } from './dividas/types';

const expenseFormSchema = z.object({
  description: z
    .string()
    .min(2, { message: 'A descrição deve ter pelo menos 2 caracteres.' }),
  category: z
    .string()
    .min(2, { message: 'A categoria deve ter pelo menos 2 caracteres.' }),
  value: z.coerce
    .number()
    .positive({ message: 'O valor deve ser positivo.' }),
  date: z.string(),
  isRecurring: z.boolean().optional().default(false),
});

export async function createExpense(values: z.infer<typeof expenseFormSchema>) {
  try {
    const validatedData = expenseFormSchema.parse(values);

    await prisma.expense.create({
      data: {
        description: validatedData.description,
        category: validatedData.category,
        value: validatedData.value,
        date: new Date(validatedData.date),
        isRecurring: validatedData.isRecurring,
      },
    });

    revalidatePath('/dashboard/financeiro');

    return {
      success: true,
      message: 'Despesa criada com sucesso.',
    };
  } catch (error) {
    console.error(error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: error.issues.map((e) => e.message).join(', '),
      };
    }

    return {
      success: false,
      message: 'Ocorreu um erro ao criar a despesa.',
    };
  }
}

export async function getFinancialOverview() {
  const expenses = await prisma.expense.findMany({
    orderBy: {
      date: 'desc',
    },
  });

  const totalExpenses = expenses.reduce((acc, expense) => acc + expense.value, 0);

  return {
    expenses,
    totalRevenue: 0,
    totalExpense: totalExpenses,
    netBalance: -totalExpenses,
  };
}

export const addTransaction = createExpense;

const DEBT_ITEMS_PER_PAGE = 10;

export async function getPaginatedDebts(
  query: string,
  currentPage: number,
  status?: DebtStatus
) {
  const offset = (currentPage - 1) * DEBT_ITEMS_PER_PAGE;

  const where: Prisma.DebtWhereInput = {
    customer: {
      name: {
        contains: query,
      },
    },
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
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Falha ao buscar dívidas.');
  }
}

export async function getTotalOpenDebt() {
  try {
    const total = await prisma.debt.aggregate({
      _sum: {
        value: true,
      },
      where: {
        status: {
          in: ['PENDENTE', 'ATRASADA'],
        },
      },
    });

    return {
      totalOpen: total._sum.value ?? 0,
    };
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Falha ao buscar o total de dívidas abertas.');
  }
}

export async function markDebtAsPaid(id: string) {
  try {
    await prisma.debt.update({
      where: { id },
      data: { status: 'PAGA' },
    });

    revalidatePath('/dashboard/financeiro/dividas');

    return {
      success: true,
      message: 'Dívida marcada como paga.',
    };
  } catch (error) {
    console.error('Database Error:', error);

    return {
      success: false,
      message: 'Falha ao atualizar a dívida.',
    };
  }
}