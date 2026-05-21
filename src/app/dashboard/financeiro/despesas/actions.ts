'use server';

import { endOfDay, endOfMonth, endOfWeek, startOfDay, startOfMonth, startOfWeek, subDays } from 'date-fns';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';

export type CreateExpenseState = {
  success: boolean;
  message: string;
  errors?: {
    description?: string[];
    value?: string[];
    date?: string[];
    category?: string[];
    isRecurring?: string[];
  };
};

const ExpenseSchema = z.object({
  description: z.string().min(3, { message: 'Descricao deve ter no minimo 3 caracteres.' }),
  value: z.coerce.number().positive({ message: 'Valor deve ser positivo.' }),
  date: z.coerce.date({ error: 'Data invalida.' }),
  category: z.string().min(1, { message: 'Por favor, selecione uma categoria.' }),
  isRecurring: z.preprocess((value) => value === 'true', z.boolean().default(false)),
});

const ITEMS_PER_PAGE = 10;

export async function getPaginatedExpenses(query: string, currentPage: number, category?: string) {
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  const where: Prisma.ExpenseWhereInput = {
    ...(category && { category }),
    ...(query && { description: { contains: query } }),
  };

  try {
    const [expenses, totalExpenses] = await Promise.all([
      prisma.expense.findMany({
        where,
        orderBy: { date: 'desc' },
        take: ITEMS_PER_PAGE,
        skip: offset,
      }),
      prisma.expense.count({ where }),
    ]);

    return { expenses, totalPages: Math.ceil(totalExpenses / ITEMS_PER_PAGE) };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Falha ao buscar despesas.');
  }
}

export async function createExpense(
  prevState: CreateExpenseState,
  formData: FormData,
): Promise<CreateExpenseState> {
  const rawFormData = Object.fromEntries(formData.entries());

  if (!rawFormData.isRecurring) {
    rawFormData.isRecurring = 'false';
  }

  const validatedFields = ExpenseSchema.safeParse(rawFormData);

  if (!validatedFields.success) {
    return {
      success: false,
      message: 'Erro de validacao. Corrija os campos e tente novamente.',
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    await prisma.expense.create({ data: validatedFields.data });
    revalidatePath('/dashboard/financeiro');
    revalidatePath('/dashboard/financeiro/despesas');
    return { success: true, message: 'Despesa criada com sucesso.', errors: {} };
  } catch (error) {
    console.error('Database Error:', error);
    return { success: false, message: 'Falha ao criar despesa no banco de dados.' };
  }
}

export async function deleteExpense(id: string): Promise<{ success: boolean; message: string }> {
  try {
    await prisma.expense.delete({ where: { id } });
    revalidatePath('/dashboard/financeiro');
    revalidatePath('/dashboard/financeiro/despesas');
    return { success: true, message: 'Despesa excluida com sucesso.' };
  } catch (error) {
    console.error('Database Error:', error);
    return { success: false, message: 'Falha ao excluir despesa.' };
  }
}

async function getRevenue(from: Date, to: Date) {
  const result = await prisma.order.aggregate({
    _sum: { netValue: true },
    where: { createdAt: { gte: from, lte: to }, status: { not: 'CANCELADO' } },
  });

  return result._sum.netValue ?? 0;
}

async function getExpenses(from: Date, to: Date) {
  const result = await prisma.expense.aggregate({
    _sum: { value: true },
    where: { date: { gte: from, lte: to } },
  });

  return result._sum.value ?? 0;
}

export async function getFinancialSummary() {
  const now = new Date();
  const [revenueToday, expensesToday, revenueWeek, expensesWeek, revenueMonth, expensesMonth] =
    await Promise.all([
      getRevenue(startOfDay(now), endOfDay(now)),
      getExpenses(startOfDay(now), endOfDay(now)),
      getRevenue(startOfWeek(now, { weekStartsOn: 1 }), endOfWeek(now, { weekStartsOn: 1 })),
      getExpenses(startOfWeek(now, { weekStartsOn: 1 }), endOfWeek(now, { weekStartsOn: 1 })),
      getRevenue(startOfMonth(now), endOfMonth(now)),
      getExpenses(startOfMonth(now), endOfMonth(now)),
    ]);

  return {
    today: { revenue: revenueToday, expenses: expensesToday, net: revenueToday - expensesToday },
    week: { revenue: revenueWeek, expenses: expensesWeek, net: revenueWeek - expensesWeek },
    month: { revenue: revenueMonth, expenses: expensesMonth, net: revenueMonth - expensesMonth },
  };
}

export async function getWeeklyChartData() {
  const today = new Date();
  const data = [];

  for (let index = 6; index >= 0; index -= 1) {
    const date = subDays(today, index);
    const dayName = date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
    const [revenue, expenses] = await Promise.all([
      getRevenue(startOfDay(date), endOfDay(date)),
      getExpenses(startOfDay(date), endOfDay(date)),
    ]);

    data.push({ name: dayName, Entradas: revenue, Saidas: expenses });
  }

  return data;
}
