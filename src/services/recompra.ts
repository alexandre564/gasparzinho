'use server';

import { prisma } from '@/lib/prisma';
import { Order, Customer } from '@prisma/client';
import { differenceInDays, addDays } from 'date-fns';

const GLOBAL_AVG_INTERVAL_DAYS = 15;

export interface RepurchasePrediction {
    customer: Customer;
    lastOrder?: Order & { items: { product: { name: string } }[] };
    avgInterval: number;
    predictedNextPurchaseDate: Date;
    daysUntilNextPurchase: number;
}

/**
 * Calculates the average number of days between a customer's confirmed orders.
 * @param orders - A list of the customer's orders, sorted by date ascending.
 * @returns The average interval in days.
 */
function calculateAverageInterval(orders: Order[]): number {
    if (orders.length < 2) {
        return GLOBAL_AVG_INTERVAL_DAYS;
    }

    const intervals = [];
    for (let i = 1; i < orders.length; i++) {
        const interval = differenceInDays(orders[i].createdAt, orders[i-1].createdAt);
        intervals.push(interval);
    }

    const totalDays = intervals.reduce((sum, interval) => sum + interval, 0);
    const average = Math.round(totalDays / intervals.length);

    // Se a média for 0 (ex: duas compras no mesmo dia), usamos o fallback global.
    return average > 0 ? average : GLOBAL_AVG_INTERVAL_DAYS; 
}

/**
 * Predicts the next repurchase date for a given customer.
 * @param customerId - The ID of the customer.
 * @returns A prediction object or null if no orders are found.
 */
export async function calculateRepurchasePredictionForCustomer(customerId: string): Promise<Omit<RepurchasePrediction, 'customer'> | null> {
    const orders = await prisma.order.findMany({
        where: {
            customerId,
            status: { in: ['ENTREGUE', 'CONFIRMADO'] }
        },
        orderBy: { createdAt: 'asc' },
        include: {
            items: {
                include: {
                    product: { select: { name: true } }
                }
            }
        }
    });

    if (orders.length === 0) {
        return null; // No basis for prediction
    }

    const lastOrder = orders[orders.length - 1];
    const avgInterval = calculateAverageInterval(orders);
    const predictedNextPurchaseDate = addDays(lastOrder.createdAt, avgInterval);
    const daysUntilNextPurchase = differenceInDays(predictedNextPurchaseDate, new Date());

    return {
        lastOrder,
        avgInterval,
        predictedNextPurchaseDate,
        daysUntilNextPurchase,
    };
}
