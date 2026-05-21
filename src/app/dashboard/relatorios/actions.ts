'use server';

import { prisma } from '@/lib/prisma';

export type ReportPeriod = 'daily' | 'monthly';

export interface SalesReportPoint {
  name: string;
  total: number;
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

async function sumOrders(start: Date, end: Date) {
  const result = await prisma.order.aggregate({
    _sum: { grossValue: true },
    where: {
      createdAt: { gte: start, lte: end },
      status: { not: 'CANCELADO' },
    },
  });

  return result._sum.grossValue ?? 0;
}

export async function getSalesReportData(period: ReportPeriod): Promise<SalesReportPoint[]> {
  const now = new Date();

  if (period === 'monthly') {
    const points = await Promise.all(
      Array.from({ length: 6 }).map(async (_, index) => {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - index, 1);
        const total = await sumOrders(startOfMonth(monthDate), endOfMonth(monthDate));

        return {
          name: monthDate.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
          total,
        };
      })
    );

    return points.reverse();
  }

  const points = await Promise.all(
    Array.from({ length: 7 }).map(async (_, index) => {
      const day = new Date(now);
      day.setDate(now.getDate() - index);
      const total = await sumOrders(startOfDay(day), endOfDay(day));

      return {
        name: day.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
        total,
      };
    })
  );

  return points.reverse();
}