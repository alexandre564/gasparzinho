'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';

const formSchema = z.object({
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

export async function createExpense(values: z.infer<typeof formSchema>) {
  try {
    const validatedData = formSchema.parse(values);

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