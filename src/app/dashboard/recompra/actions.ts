'use server';

import type { Order } from '@prisma/client';
import { addDays, differenceInCalendarDays } from 'date-fns';
import { prisma } from '@/lib/prisma';
import type { RepurchasePrediction } from '@/services/recompra';

const GLOBAL_AVG_INTERVAL_DAYS = 15;
const REPURCHASE_ORDER_STATUSES = ['CONFIRMADO', 'ENVIADO', 'ENTREGUE'] as const;

async function getCustomersWithOrderHistory() {
  return prisma.customer.findMany({
    include: {
      orders: {
        where: {
          status: {
            in: [...REPURCHASE_ORDER_STATUSES],
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });
}

type CustomerWithOrderHistory = Awaited<
  ReturnType<typeof getCustomersWithOrderHistory>
>[number];

function calculateAverageInterval(orders: Order[]) {
  if (orders.length < 2) {
    return GLOBAL_AVG_INTERVAL_DAYS;
  }

  const intervals: number[] = [];

  for (let index = 1; index < orders.length; index += 1) {
    intervals.push(
      differenceInCalendarDays(orders[index].createdAt, orders[index - 1].createdAt),
    );
  }

  const validIntervals = intervals.filter((interval) => interval > 0);

  if (validIntervals.length === 0) {
    return GLOBAL_AVG_INTERVAL_DAYS;
  }

  const total = validIntervals.reduce((sum, interval) => sum + interval, 0);
  return Math.max(1, Math.round(total / validIntervals.length));
}

function buildPrediction(customer: CustomerWithOrderHistory): RepurchasePrediction | null {
  if (customer.orders.length === 0) {
    return null;
  }

  const lastOrder = customer.orders[customer.orders.length - 1];
  const avgInterval = calculateAverageInterval(customer.orders);
  const predictedNextPurchaseDate = addDays(lastOrder.createdAt, avgInterval);
  const daysUntilNextPurchase = differenceInCalendarDays(
    predictedNextPurchaseDate,
    new Date(),
  );
  const { orders, ...customerData } = customer;

  return {
    customer: customerData,
    lastOrder,
    avgInterval,
    predictedNextPurchaseDate,
    daysUntilNextPurchase,
  };
}

/**
 * Gets repurchase predictions for customers based on a specified time frame.
 * @param days - The number of days ahead to look for predicted repurchases.
 * @returns A list of repurchase predictions.
 */
export async function getRepurchasePredictions(
  days: number = 3,
): Promise<RepurchasePrediction[]> {
  const customers = await getCustomersWithOrderHistory();

  return customers
    .map(buildPrediction)
    .filter((prediction): prediction is RepurchasePrediction => Boolean(prediction))
    .filter(
      (prediction) =>
        prediction.daysUntilNextPurchase >= 0 &&
        prediction.daysUntilNextPurchase <= days,
    )
    .sort((a, b) => a.daysUntilNextPurchase - b.daysUntilNextPurchase);
}
