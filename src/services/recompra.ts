'use server';

import { Customer, Order } from '@prisma/client';
import { addDays, differenceInCalendarDays } from 'date-fns';

import { prisma } from '@/lib/prisma';

const GLOBAL_AVG_INTERVAL_DAYS = 15;

export interface RepurchasePrediction {
  customer: Customer;
  lastOrder?: Order & { items: { product: { name: string } }[] };
  avgInterval: number;
  predictedNextPurchaseDate: Date;
  daysUntilNextPurchase: number;
}

function calculateAverageInterval(orders: Order[]): number {
  if (orders.length < 2) {
    return GLOBAL_AVG_INTERVAL_DAYS;
  }

  const intervals: number[] = [];

  for (let index = 1; index < orders.length; index += 1) {
    const interval = differenceInCalendarDays(
      orders[index].createdAt,
      orders[index - 1].createdAt,
    );

    if (interval > 0) {
      intervals.push(interval);
    }
  }

  if (intervals.length === 0) {
    return GLOBAL_AVG_INTERVAL_DAYS;
  }

  const totalDays = intervals.reduce((sum, interval) => sum + interval, 0);
  const average = Math.round(totalDays / intervals.length);

  return average > 0 ? average : GLOBAL_AVG_INTERVAL_DAYS;
}

export async function calculateRepurchasePredictionForCustomer(
  customerId: string,
): Promise<Omit<RepurchasePrediction, 'customer'> | null> {
  const orders = await prisma.order.findMany({
    where: {
      customerId,
      status: { in: ['ENTREGUE', 'CONFIRMADO', 'ENVIADO'] },
    },
    orderBy: { createdAt: 'asc' },
    include: {
      items: {
        include: {
          product: { select: { name: true } },
        },
      },
    },
  });

  if (orders.length === 0) {
    return null;
  }

  const lastOrder = orders[orders.length - 1];
  const avgInterval = calculateAverageInterval(orders);
  const predictedNextPurchaseDate = addDays(lastOrder.createdAt, avgInterval);
  const daysUntilNextPurchase = differenceInCalendarDays(
    predictedNextPurchaseDate,
    new Date(),
  );

  return {
    lastOrder,
    avgInterval,
    predictedNextPurchaseDate,
    daysUntilNextPurchase,
  };
}
