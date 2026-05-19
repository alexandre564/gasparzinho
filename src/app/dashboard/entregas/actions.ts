'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { DeliveryStatus } from '@/types/enums';
import { Prisma } from '@prisma/client';

const ITEMS_PER_PAGE = 15;

export async function getPaginatedDeliveries(query: string, currentPage: number, status?: DeliveryStatus) {
    const offset = (currentPage - 1) * ITEMS_PER_PAGE;

    const where: Prisma.DeliveryWhereInput = {
        ...(status && { status }),
        ...(query && {
            OR: [
                { order: { customer: { name: { contains: query } } } },
                { orderId: { contains: query } },
            ],
        }),
    };

    try {
        const deliveries = await prisma.delivery.findMany({
            where,
            include: {
                order: {
                    include: {
                        customer: true,
                        items: { include: { product: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: ITEMS_PER_PAGE,
            skip: offset,
        });

        const totalDeliveries = await prisma.delivery.count({ where });

        return { deliveries, totalPages: Math.ceil(totalDeliveries / ITEMS_PER_PAGE) };

    } catch (err) {
        console.error('Database Error:', err);
        throw new Error('Falha ao buscar entregas.');
    }
}

export async function updateDeliveryStatus(deliveryId: string, status: DeliveryStatus): Promise<{ success: boolean; message: string }> {
    if (!deliveryId || !status) {
        return { success: false, message: "ID da entrega e status são obrigatórios." };
    }

    try {
        await prisma.delivery.update({
            where: { id: deliveryId },
            data: { status },
        });

        revalidatePath('/dashboard/entregas');
        revalidatePath(`/dashboard/entregas/${deliveryId}`); // Se houver página de detalhe
        return { success: true, message: `Status da entrega atualizado para ${status}.` };

    } catch (error) {
        console.error('Database Error:', error);
        return { success: false, message: "Falha ao atualizar o status da entrega." };
    }
}

export async function getDeliveryDetails(id: string) {
    try {
        const delivery = await prisma.delivery.findUnique({
             where: { id },
             include: {
                order: {
                    include: {
                        customer: true,
                        items: { include: { product: true } },
                    },
                },
            },
        });
        return delivery;
    } catch (error) {
        console.error('Database Error:', error);
        throw new Error('Failed to fetch delivery details.');
    }
}

export async function getOrderById(id: string) {
    try {
        const order = await prisma.order.findUnique({
            where: { id },
            include: {
                customer: true,
                items: { include: { product: true } },
                delivery: true,
            },
        });
        return order;
    } catch (error) {
        console.error('Database Error:', error);
        throw new Error('Failed to fetch order.');
    }
}

export async function updateDelivery(id: string, data: any) {
    try {
        await prisma.delivery.update({
            where: { id },
            data,
        });
        revalidatePath('/dashboard/entregas');
        revalidatePath(`/dashboard/entregas/${id}`);
    } catch (error) {
        console.error('Database Error:', error);
        throw new Error('Failed to update delivery.');
    }
}
