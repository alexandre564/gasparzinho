'use server';

import { prisma } from '@/lib/prisma';

export type ReportPeriod = 'daily' | 'monthly';

export interface SalesReportPoint {
  name: string;
  total: number;
  expenses: number;
  net: number;
  ordersCount: number;
  avgTicket: number;
}

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

async function getPeriodTotals(start: Date, end: Date) {
  const orderWhere = {
    createdAt: { gte: start, lte: end },
    status: { not: 'CANCELADO' },
  };
  const [ordersTotal, ordersCount, expensesTotal] = await prisma.$transaction([
    prisma.order.aggregate({
      _sum: { grossValue: true },
      where: orderWhere,
    }),
    prisma.order.count({ where: orderWhere }),
    prisma.expense.aggregate({
      _sum: { value: true },
      where: { date: { gte: start, lte: end } },
    }),
  ]);
  const total = ordersTotal._sum.grossValue ?? 0;
  const expenses = expensesTotal._sum.value ?? 0;

  return {
    total,
    expenses,
    net: total - expenses,
    ordersCount,
    avgTicket: ordersCount > 0 ? total / ordersCount : 0,
  };
}

export async function getSalesReportData(period: ReportPeriod): Promise<SalesReportPoint[]> {
  const now = new Date();

  if (period === 'monthly') {
    const points = await Promise.all(
      Array.from({ length: 6 }).map(async (_, index) => {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - index, 1);
        const totals = await getPeriodTotals(startOfMonth(monthDate), endOfMonth(monthDate));

        return {
          name: monthDate.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
          ...totals,
        };
      })
    );

    return points.reverse();
  }

  const points = await Promise.all(
    Array.from({ length: 7 }).map(async (_, index) => {
      const day = new Date(now);
      day.setDate(now.getDate() - index);
      const totals = await getPeriodTotals(startOfDay(day), endOfDay(day));

      return {
        name: day.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
        ...totals,
      };
    })
  );

  return points.reverse();
}
