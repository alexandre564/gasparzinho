'use server';

import type { Order } from '@prisma/client';
import { addDays, differenceInCalendarDays } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { cleanCustomerTextFields, normalizeSearchText, onlyDigits } from '@/lib/contact-text';
import type { LoyaltyPrediction } from '@/services/fidelizacao';

const GLOBAL_AVG_INTERVAL_DAYS = 15;
const REPURCHASE_ORDER_STATUSES = ['CONFIRMADO', 'ENVIADO', 'ENTREGUE', 'CONCLUIDO'] as const;

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

function buildPrediction(customer: CustomerWithOrderHistory): LoyaltyPrediction | null {
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
  const cleanedCustomer = cleanCustomerTextFields(customerData);

  return {
    customer: cleanedCustomer,
    lastOrder,
    avgInterval,
    predictedNextPurchaseDate,
    daysUntilNextPurchase,
  };
}

function predictionMatchesSearch(prediction: LoyaltyPrediction, query: string) {
  const term = normalizeSearchText(query);
  const digits = onlyDigits(query);

  if (!term && !digits) return true;

  const textMatch = [
    prediction.customer.name,
    prediction.customer.phone,
    prediction.customer.city,
    prediction.lastOrder?.items[0]?.product.name,
  ]
    .map(normalizeSearchText)
    .some((value) => value.includes(term));
  const phoneMatch = Boolean(digits) && onlyDigits(prediction.customer.phone).includes(digits);

  return textMatch || phoneMatch;
}

export async function getLoyaltyPredictions(
  days: number = 3,
  query: string = '',
): Promise<LoyaltyPrediction[]> {
  const customers = await getCustomersWithOrderHistory();

  return customers
    .map(buildPrediction)
    .filter((prediction): prediction is LoyaltyPrediction => Boolean(prediction))
    .filter((prediction) => predictionMatchesSearch(prediction, query))
    .filter((prediction) => Math.abs(prediction.daysUntilNextPurchase) <= days)
    .sort((a, b) => a.daysUntilNextPurchase - b.daysUntilNextPurchase);
}

export const getRepurchasePredictions = getLoyaltyPredictions;
