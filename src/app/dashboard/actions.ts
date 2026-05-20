'use server'

import { signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, subDays } from 'date-fns';

export async function doSignOut() {
    await signOut({ redirectTo: '/login' });
}

export async function getDashboardKpis() {
    const today = new Date();
    const startOfToday = startOfDay(today);
    const endOfToday = endOfDay(today);

    const [dailyRevenue, dailySales, ongoingDeliveries, clientsWithDebt] = await Promise.all([
        prisma.order.aggregate({
            _sum: { netValue: true },
            where: {
                createdAt: { gte: startOfToday, lte: endOfToday },
                status: { in: ['CONFIRMADO', 'CONCLUIDO'] },
            },
        }),
        prisma.order.count({
            where: {
                createdAt: { gte: startOfToday, lte: endOfToday },
                status: { in: ['CONFIRMADO', 'CONCLUIDO'] },
            },
        }),
        prisma.delivery.count({
            where: { status: 'EM_ROTA' },
        }),
        prisma.debt.count({
            where: { status: 'PENDENTE' },
        }),
    ]);

    return {
        dailyRevenue: dailyRevenue._sum.netValue ?? 0,
        dailySales,
        ongoingDeliveries,
        clientsWithDebt,
    };
}

export async function getRecentSales() {
    const today = new Date();
    const startOfToday = startOfDay(today);
    const endOfToday = endOfDay(today);

    const recentSales = await prisma.order.findMany({
        where: {
            createdAt: { gte: startOfToday, lte: endOfToday },
        },
        include: {
            customer: { select: { name: true } },
        },
        orderBy: {
            createdAt: 'desc',
        },
        take: 5,
    });
    return recentSales;
}

export async function getCriticalStockProducts() {
    const criticalStock = await prisma.product.findMany({
        where: {
            inventory: { lte: 10 }, // Define critical level
        },
        orderBy: {
            inventory: 'asc',
        },
        take: 5,
    });
    return criticalStock;
}

export async function getDebtorCustomers() {
    const debtors = await prisma.debt.findMany({
        where: {
            status: 'PENDENTE',
        },
        include: {
            customer: { select: { name: true } },
        },
        orderBy: {
            dueDate: 'asc',
        },
        take: 5,
    });
    return debtors;
}

export async function getRepurchaseOpportunities() {
    const thirtyDaysAgo = subDays(new Date(), 30);

    // Find customers who haven't purchased in the last 30 days
    const opportunities = await prisma.customer.findMany({
        where: {
            orders: {
                every: {
                    createdAt: { lt: thirtyDaysAgo },
                },
            },
        },
        include: {
            orders: {
                orderBy: {
                    createdAt: 'desc',
                },
                take: 1,
            },
        },
        take: 5,
    });

    return opportunities.map(c => ({
        ...c,
        lastPurchase: c.orders[0]?.createdAt ?? null,
    }));
}

