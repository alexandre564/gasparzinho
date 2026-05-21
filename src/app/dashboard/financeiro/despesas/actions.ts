'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { startOfDay, endOfDay, startOfWeek, startOfMonth, endOfWeek, endOfMonth, subDays } from 'date-fns';

// State definition for the createExpense action
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

// Zod schema for validation
const ExpenseSchema = z.object({
    description: z.string().min(3, { message: 'Descrição deve ter no mínimo 3 caracteres.' }),
    value: z.coerce.number().positive({ message: 'Valor deve ser positivo.' }),
    date: z.coerce.date({
        error: "Data inválida.",
    }),
    category: z.string().min(1, { message: 'Por favor, selecione uma categoria.' }),
    isRecurring: z.preprocess((val) => val === 'true', z.boolean().default(false)),
});

const ITEMS_PER_PAGE = 10;

export async function getPaginatedExpenses(query: string, currentPage: number, category?: string) {
    const offset = (currentPage - 1) * ITEMS_PER_PAGE;

    const where: Prisma.ExpenseWhereInput = {
        ...(category && { category }),
        ...(query && { description: { contains: query } }),
    };

    try {
        const expenses = await prisma.expense.findMany({
            where,
            orderBy: { date: 'desc' },
            take: ITEMS_PER_PAGE,
            skip: offset,
        });

        const totalExpenses = await prisma.expense.count({ where });
        return { expenses, totalPages: Math.ceil(totalExpenses / ITEMS_PER_PAGE) };

    } catch (err) {
        console.error('Database Error:', err);
        throw new Error('Falha ao buscar despesas.');
    }
}

export async function createExpense(
    prevState: CreateExpenseState,
    formData: FormData
): Promise<CreateExpenseState> {
    const rawFormData = Object.fromEntries(formData.entries());

    // Handle checkbox value which is not present in formData if unchecked
    if (!rawFormData.isRecurring) {
        rawFormData.isRecurring = 'false';
    }

    const validatedFields = ExpenseSchema.safeParse(rawFormData);

    if (!validatedFields.success) {
        return {
            success: false,
            message: 'Erro de validação. Corrija os campos e tente novamente.',
            errors: validatedFields.error.flatten().fieldErrors
        };
    }

    try {
        await prisma.expense.create({ data: validatedFields.data });
        revalidatePath('/dashboard/financeiro');
        revalidatePath('/dashboard/financeiro/despesas');
        return { success: true, message: 'Despesa criada com sucesso!', errors: {} };
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
        return { success: true, message: 'Despesa excluída com sucesso.' };
    } catch (error) {
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
    const revenueToday = await getRevenue(startOfDay(new Date()), endOfDay(new Date()));
    const expensesToday = await getExpenses(startOfDay(new Date()), endOfDay(new Date()));

    const revenueWeek = await getRevenue(startOfWeek(new Date(), { weekStartsOn: 1 }), endOfWeek(new Date(), { weekStartsOn: 1 }));
    const expensesWeek = await getExpenses(startOfWeek(new Date(), { weekStartsOn: 1 }), endOfWeek(new Date(), { weekStartsOn: 1 }));

    const revenueMonth = await getRevenue(startOfMonth(new Date()), endOfMonth(new Date()));
    const expensesMonth = await getExpenses(startOfMonth(new Date()), endOfMonth(new Date()));

    return {
        today: { revenue: revenueToday, expenses: expensesToday, net: revenueToday - expensesToday },
        week: { revenue: revenueWeek, expenses: expensesWeek, net: revenueWeek - expensesWeek },
        month: { revenue: revenueMonth, expenses: expensesMonth, net: revenueMonth - expensesMonth },
    };
}

export async function getWeeklyChartData() {
    const today = new Date();
    const data = [];

    for (let i = 6; i >= 0; i--) {
        const date = subDays(today, i);
        const dayName = date.toLocaleDateString('pt-BR', { weekday: 'short' });

        const revenue = await getRevenue(startOfDay(date), endOfDay(date));
        const expenses = await getExpenses(startOfDay(date), endOfDay(date));
        
        data.push({ name: dayName, Entradas: revenue, Saidas: expenses });
    }

    return data;
}
