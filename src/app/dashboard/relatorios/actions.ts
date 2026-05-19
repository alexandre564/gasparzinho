'use server';

import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';

export interface MonthlySalesData {
  name: string;
  total: number;
}

export async function getMonthlySalesData(): Promise<MonthlySalesData[]> {
  const orders = await prisma.order.findMany({
    where: {
      status: 'ENTREGUE',
    },
    select: {
      createdAt: true,
      grossValue: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  const monthlySales = orders.reduce((acc, order) => {
    const month = format(order.createdAt, 'MMM/yy');
    const total = order.grossValue;

    if (!acc[month]) {
      acc[month] = { name: month, total: 0 };
    }

    acc[month].total += total;
    return acc;
  }, {} as Record<string, { name: string; total: number }>);

  return Object.values(monthlySales);
}
