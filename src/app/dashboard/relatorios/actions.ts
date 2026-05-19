'use server';

import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';

export interface MonthlySalesData {
    name: string;
    total: number;
}

// Esta action busca e processa os dados no servidor
export async function getMonthlySalesData(): Promise<MonthlySalesData[]> {
    const orders = await prisma.order.findMany({
        where: {
            status: 'ENTREGUE', // Consideramos "venda" um pedido entregue
        },
        select: {
            createdAt: true,
            total: true,
        },
        orderBy: {
            createdAt: 'asc',
        }
    });

    const monthlySales = orders.reduce((acc, order) => {
        // Agrupa as vendas por mês, ex: "Jan/24"
        const month = format(order.createdAt, 'MMM/yy');
        const total = order.total; // Converte o tipo Decimal do Prisma para number
        
        if (!acc[month]) {
            acc[month] = { name: month, total: 0 };
        }
        
        acc[month].total += total;
        return acc;
    }, {} as Record<string, { name: string; total: number }>);

    return Object.values(monthlySales);
}
