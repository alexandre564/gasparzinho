'use server';

import { prisma } from '@/lib/prisma';
import { calculateRepurchasePredictionForCustomer, RepurchasePrediction } from '@/services/recompra';

/**
 * Gets repurchase predictions for all active customers based on a specified time frame.
 * @param days - The number of days ahead to look for predicted repurchases (e.g., 3, 7, 15).
 * @returns A list of repurchase predictions.
 */
export async function getRepurchasePredictions(days: number = 3): Promise<RepurchasePrediction[]> {
    
    const allCustomers = await prisma.customer.findMany({
        where: { 
            active: true,
            // Opcional: Adicionar um filtro para clientes com pelo menos um pedido, se o volume de clientes for muito grande.
            // orders: { some: {} } 
        },
    });

    const predictions: RepurchasePrediction[] = [];

    for (const customer of allCustomers) {
        const predictionData = await calculateRepurchasePredictionForCustomer(customer.id);

        if (!predictionData) {
            continue; // Skip customers with no prediction data
        }

        // Filtra para incluir apenas clientes cuja data de recompra prevista está no futuro e dentro da janela de dias especificada.
        if (predictionData.daysUntilNextPurchase >= 0 && predictionData.daysUntilNextPurchase <= days) {
            predictions.push({
                customer,
                ...predictionData
            });
        }
    }

    // Ordena as previsões para mostrar as mais próximas primeiro.
    return predictions.sort((a, b) => a.daysUntilNextPurchase - b.daysUntilNextPurchase);
}
