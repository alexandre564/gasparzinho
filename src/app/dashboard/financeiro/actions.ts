'use server';

import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import type { DebtStatus } from './dividas/types';

const expenseFormSchema = z.object({
  description: z
    .string()
    .min(2, { message: 'A descricao deve ter pelo menos 2 caracteres.' }),
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
    revalidatePath('/dashboard/financeiro/despesas');

    return {
      success: true,
      message: 'Despesa criada com sucesso.',
    };
  } catch (error) {
    console.error(error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: error.issues.map((issue) => issue.message).join(', '),
      };
    }

    return {
      success: false,
      message: 'Ocorreu um erro ao criar a despesa.',
    };
  }
}

export async function getFinancialOverview() {
  const [expenses, revenue] = await Promise.all([
    prisma.expense.findMany({
      orderBy: { date: 'desc' },
    }),
    prisma.order.aggregate({
      _sum: { grossValue: true },
      where: { status: { not: 'CANCELADO' } },
    }),
  ]);

  const totalExpenses = expenses.reduce((acc, expense) => acc + expense.value, 0);
  const totalRevenue = revenue._sum.grossValue ?? 0;

  return {
    expenses,
    totalRevenue,
    totalExpense: totalExpenses,
    netBalance: totalRevenue - totalExpenses,
  };
}

export async function addTransaction(
  _previousState: {
    success?: boolean;
    message: string | null;
    errors?: Record<string, string[]>;
  },
  formData: FormData,
) {
  const parsed = expenseFormSchema.safeParse({
    description: formData.get('description'),
    category: formData.get('category'),
    value: formData.get('value'),
    date: formData.get('date'),
    isRecurring: formData.get('isRecurring') === 'true',
  });

  if (!parsed.success) {
    return {
      success: false,
      message: 'Verifique os dados da despesa.',
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const result = await createExpense(parsed.data);
  return {
    success: result.success,
    message: result.message,
    errors: {},
  };
}

const DEBT_ITEMS_PER_PAGE = 10;

export async function getPaginatedDebts(
  query: string,
  currentPage: number,
  status?: DebtStatus,
) {
  const offset = (currentPage - 1) * DEBT_ITEMS_PER_PAGE;

  const where: Prisma.DebtWhereInput = {
    ...(query ? { customer: { name: { contains: query } } } : {}),
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
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Falha ao buscar dividas.');
  }
}

export async function getTotalOpenDebt() {
  try {
    const total = await prisma.debt.aggregate({
      _sum: { value: true },
      where: { status: { in: ['PENDENTE', 'VENCIDO', 'RENEGOCIADO'] } },
    });

    return {
      totalOpen: total._sum.value ?? 0,
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Falha ao buscar o total de dividas abertas.');
  }
}

export async function markDebtAsPaid(id: string) {
  try {
    await prisma.debt.update({
      where: { id },
      data: {
        status: 'PAGO',
        paidAt: new Date(),
      },
    });

    revalidatePath('/dashboard/financeiro/dividas');
    revalidatePath('/dashboard/cobranca');

    return {
      success: true,
      message: 'Divida marcada como paga.',
    };
  } catch (error) {
    console.error('Database Error:', error);

    return {
      success: false,
      message: 'Falha ao atualizar a divida.',
    };
  }
}
