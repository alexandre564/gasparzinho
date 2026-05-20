'use server';

import { prisma } from '@/lib/prisma';
import {
  calculateRepurchasePredictionForCustomer,
  RepurchasePrediction,
} from '@/services/recompra';

/**
 * Gets repurchase predictions for customers based on a specified time frame.
 * @param days - The number of days ahead to look for predicted repurchases.
 * @returns A list of repurchase predictions.
 */
export async function getRepurchasePredictions(
  days: number = 3,
): Promise<RepurchasePrediction[]> {
  const allCustomers = await prisma.customer.findMany({
    // Se no futuro o schema tiver um campo de status/ativo real,
    // o filtro pode ser reintroduzido com base no nome correto.
  });

  const predictions: RepurchasePrediction[] = [];

  for (const customer of allCustomers) {
    const predictionData =
      await calculateRepurchasePredictionForCustomer(customer.id);

    if (!predictionData) {
      continue;
    }

    if (
      predictionData.daysUntilNextPurchase >= 0 &&
      predictionData.daysUntilNextPurchase <= days
    ) {
      predictions.push({
        customer,
        ...predictionData,
      });
    }
  }

  return predictions.sort(
    (a, b) => a.daysUntilNextPurchase - b.daysUntilNextPurchase,
  );
}
