'use server';

import { endOfDay, startOfDay } from 'date-fns';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { OrderStatus } from '@/types/enums';

const DailyClosingSchema = z.object({
  date: z.date(),
  totalRevenue: z.number(),
  totalExpenses: z.number(),
  netBalance: z.number(),
  ordersCount: z.number(),
  stockForecast: z.string().optional(),
});

export type ClosingSale = {
  id: string;
  createdAt: Date;
  customer: { name: string };
  grossValue: number;
  netValue: number;
};

export type StockForecastItem = {
  name: string;
  units: number;
};

export async function getDailyClosingData() {
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  const [sales, expenses, currentStock, todayClosing] = await Promise.all([
    prisma.order.findMany({
      where: {
        createdAt: { gte: todayStart, lte: todayEnd },
        status: { in: [OrderStatus.CONFIRMADO, OrderStatus.CONCLUIDO, OrderStatus.ENTREGUE] },
      },
      include: { customer: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.expense.findMany({
      where: { date: { gte: todayStart, lte: todayEnd } },
    }),
    prisma.product.findMany({
      select: { name: true, inventory: true },
      orderBy: { name: 'asc' },
    }),
    prisma.dailyClosing.findFirst({
      where: { date: { gte: todayStart, lte: todayEnd } },
    }),
  ]);

  const totalRevenue = sales.reduce((sum, order) => sum + order.grossValue, 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.value, 0);
  const netBalance = totalRevenue - totalExpenses;
  const ordersCount = sales.length;
  const stockForecast: StockForecastItem[] = currentStock.map((product) => ({
    name: product.name,
    units: product.inventory ?? 0,
  }));

  return {
    sales: sales.map((sale) => ({
      id: sale.id,
      createdAt: sale.createdAt,
      customer: sale.customer,
      grossValue: sale.grossValue,
      netValue: sale.netValue,
    })),
    totalRevenue,
    totalExpenses,
    netBalance,
    ordersCount,
    stockForecast,
    isAlreadyClosed: Boolean(todayClosing),
  };
}

export async function createDailyClosing(
  data: unknown,
): Promise<{ success: boolean; message: string }> {
  const validatedFields = DailyClosingSchema.safeParse(data);

  if (!validatedFields.success) {
    return { success: false, message: 'Erro de validacao nos dados do fechamento.' };
  }

  const { date, totalRevenue, totalExpenses, netBalance, ordersCount, stockForecast } =
    validatedFields.data;
  const dayStart = startOfDay(date);

  try {
    const existingClosing = await prisma.dailyClosing.findFirst({
      where: { date: { gte: dayStart, lte: endOfDay(date) } },
    });

    if (existingClosing) {
      return { success: false, message: 'O fechamento de hoje ja foi realizado.' };
    }

    await prisma.dailyClosing.create({
      data: {
        date: dayStart,
        totalSales: totalRevenue,
        totalRevenue,
        totalExpenses,
        netBalance,
        ordersCount,
        notes: stockForecast ? `Estoque no fechamento: ${stockForecast}` : null,
      },
    });

    revalidatePath('/dashboard/fechamento');
    return { success: true, message: 'Fechamento do dia realizado com sucesso.' };
  } catch (error) {
    console.error('Database Error:', error);
    return { success: false, message: 'Nao foi possivel salvar o fechamento no banco de dados.' };
  }
}

export async function getClosingHistory() {
  const history = await prisma.dailyClosing.findMany({
    take: 30,
    orderBy: { date: 'desc' },
  });

  return history.map((item) => ({
    id: item.id,
    date: item.date,
    totalRevenue: Number(item.totalRevenue),
    totalExpenses: Number(item.totalExpenses),
    netBalance: Number(item.netBalance),
    ordersCount: item.ordersCount,
  }));
}
