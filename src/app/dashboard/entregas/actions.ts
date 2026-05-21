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
                        debt: true,
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
        return { success: false, message: "ID da entrega e status sÃƒÆ’Ã‚Â£o obrigatÃƒÆ’Ã‚Â³rios." };
    }

    try {
        await prisma.delivery.update({
            where: { id: deliveryId },
            data: { status },
        });

        revalidatePath('/dashboard/entregas');
        revalidatePath(`/dashboard/entregas/${deliveryId}`); // Se houver pÃƒÆ’Ã‚Â¡gina de detalhe
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
                        debt: true,
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
                        debt: true,
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

export async function markDeliverySentToDriver(deliveryId: string): Promise<{ success: boolean; message: string }> {
  try {
    const delivery = await prisma.delivery.update({
      where: { id: deliveryId },
      data: { status: DeliveryStatus.EM_ROTA },
      include: { order: true },
    });

    await prisma.order.update({
      where: { id: delivery.orderId },
      data: { status: 'ENVIADO' },
    });

    revalidatePath('/dashboard/entregas');
    revalidatePath('/dashboard/vendas');
    return { success: true, message: 'Entrega marcada como enviada ao entregador.' };
  } catch (error) {
    console.error('Database Error:', error);
    return { success: false, message: 'Falha ao enviar entrega ao entregador.' };
  }
}

export async function confirmDeliveryPayment(
  deliveryId: string,
  paymentResult: 'PAGO' | 'A_RECEBER'
): Promise<{ success: boolean; message: string }> {
  try {
    await prisma.$transaction(async (tx) => {
      const delivery = await tx.delivery.findUnique({
        where: { id: deliveryId },
        include: { order: { include: { debt: true, customer: true } } },
      });

      if (!delivery) {
        throw new Error('Entrega nao encontrada.');
      }

      await tx.delivery.update({
        where: { id: deliveryId },
        data: { status: DeliveryStatus.ENTREGUE },
      });

      await tx.order.update({
        where: { id: delivery.orderId },
        data: { status: 'ENTREGUE' },
      });

      if (paymentResult === 'PAGO') {
        if (delivery.order.debt) {
          await tx.debt.update({
            where: { id: delivery.order.debt.id },
            data: { status: 'PAGO', paidAt: new Date() },
          });
        }
        return;
      }

      const dueDate = delivery.order.paymentDueDate ?? new Date();
      if (!delivery.order.paymentDueDate) {
        dueDate.setDate(dueDate.getDate() + 30);
      }

      if (delivery.order.debt) {
        await tx.debt.update({
          where: { id: delivery.order.debt.id },
          data: { status: 'PENDENTE', dueDate, originalDueDate: delivery.order.debt.originalDueDate ?? delivery.order.debt.dueDate, paidAt: null },
        });
      } else {
        await tx.debt.create({
          data: {
            customerId: delivery.order.customerId,
            orderId: delivery.orderId,
            value: delivery.order.grossValue,
            dueDate,
            originalDueDate: dueDate,
            status: 'PENDENTE',
          },
        });
      }
    });

    revalidatePath('/dashboard/entregas');
    revalidatePath('/dashboard/vendas');
    revalidatePath('/dashboard/financeiro/dividas');
    revalidatePath('/dashboard/cobranca');

    return {
      success: true,
      message: paymentResult === 'PAGO'
        ? 'Entrega confirmada e pagamento marcado como pago.'
        : 'Entrega confirmada e valor registrado a receber.',
    };
  } catch (error) {
    console.error('Database Error:', error);
    return { success: false, message: 'Falha ao confirmar entrega.' };
  }
}