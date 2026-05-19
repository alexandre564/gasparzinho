'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { startOfDay, endOfDay } from 'date-fns';
import { OrderStatus } from "@/types/enums";
import { z } from 'zod';

const DailyClosingSchema = z.object({
    date: z.date(),
    totalRevenue: z.number(),
    totalExpenses: z.number(),
    netBalance: z.number(),
    ordersCount: z.number(),
    stockForecast: z.string(), // JSON string for stock data
});

export async function getDailyClosingData() {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const sales = await prisma.order.findMany({
        where: {
            createdAt: { gte: todayStart, lte: todayEnd },
            status: { in: [OrderStatus.CONFIRMADO, OrderStatus.CONCLUIDO] },
        },
        include: { customer: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
    });

    const expenses = await prisma.expense.findMany({
        where: { date: { gte: todayStart, lte: todayEnd } },
    });

    const totalRevenue = sales.reduce((sum, order) => sum + order.netValue, 0);
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.value, 0);
    const netBalance = totalRevenue - totalExpenses;
    const ordersCount = sales.length;

    // Estoque atual para previsão de amanhã
    const currentStock = await prisma.product.findMany({
        select: { name: true, inventory: true },
        orderBy: { name: 'asc' },
    });
    const stockForecast = JSON.stringify(currentStock.map(p => ({ 
        name: p.name, 
        units: p.inventory ?? 0 ?? 0 
    })));

    const todayClosing = await prisma.dailyClosing.findFirst({
        where: { date: { gte: todayStart, lte: todayEnd } },
    });

    return {
        sales,
        totalRevenue,
        totalExpenses,
        netBalance,
        ordersCount,
        stockForecast,
        isAlreadyClosed: !!todayClosing,
    };
}

export async function createDailyClosing(data: unknown): Promise<{ success: boolean; message: string }> {
    const validatedFields = DailyClosingSchema.safeParse(data);

    if (!validatedFields.success) {
        console.error('Validation Errors:', validatedFields.error.flatten().fieldErrors);
        return { success: false, message: 'Erro de validação nos dados do fechamento.' };
    }

    const { date, totalRevenue, totalExpenses, netBalance, ordersCount, stockForecast } = validatedFields.data;
    const todayStart = startOfDay(date);

    try {
        const existingClosing = await prisma.dailyClosing.findFirst({
             where: { date: { gte: startOfDay(date), lte: endOfDay(date) } },
        });

        if (existingClosing) {
            return { success: false, message: 'O fechamento para hoje já foi realizado.' };
        }

        await (prisma.dailyClosing as any).create({
            data: {
                date: todayStart, // Salva a data sem a hora
                totalRevenue,
                totalExpenses,
                netBalance,
                ordersCount,
                stockForecast,
            },
        });

        revalidatePath('/dashboard/fechamento');
        return { success: true, message: 'Fechamento do dia realizado com sucesso!' };
    } catch (error) {
        console.error('Database Error:', error);
        return { success: false, message: 'Não foi possível salvar o fechamento no banco de dados.' };
    }
}

export async function getClosingHistory(): Promise<any[]> {
    const history = await prisma.dailyClosing.findMany({
        take: 30,
        orderBy: { date: 'desc' },
    });
  return history.map((h) => ({ ...h, totalSales: Number(h.totalSales), totalExpenses: Number(h.totalExpenses), totalRevenue: Number(h.totalRevenue), netBalance: Number(h.netBalance) }));
}
