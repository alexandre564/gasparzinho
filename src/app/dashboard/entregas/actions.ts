'use server';

import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireActionAccess } from '@/lib/api-auth';
import { DeliveryStatus } from '@/types/enums';

const ITEMS_PER_PAGE = 15;

function parseFilterDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function getPaginatedDeliveries(
  query: string,
  currentPage: number,
  status?: DeliveryStatus,
  from?: string,
  to?: string,
) {
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;
  const fromDate = parseFilterDate(from);
  const toDate = parseFilterDate(to);

  if (toDate) {
    toDate.setHours(23, 59, 59, 999);
  }

  const where: Prisma.DeliveryWhereInput = {
    ...(status && { status }),
    ...(fromDate || toDate
      ? {
          order: {
            createdAt: {
              ...(fromDate ? { gte: fromDate } : {}),
              ...(toDate ? { lte: toDate } : {}),
            },
          },
        }
      : {}),
    ...(query && {
      OR: [
        { order: { customer: { name: { contains: query } } } },
        { order: { customer: { phone: { contains: query } } } },
        { order: { customer: { street: { contains: query } } } },
        { order: { customer: { number: { contains: query } } } },
        { order: { customer: { neighborhood: { contains: query } } } },
        { order: { customer: { city: { contains: query } } } },
        { order: { customer: { reference: { contains: query } } } },
        { order: { paymentMethod: { contains: query.toUpperCase() } } },
        { status: { contains: query.toUpperCase() } },
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
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Falha ao buscar entregas.');
  }
}

export async function updateDeliveryStatus(
  deliveryId: string,
  status: DeliveryStatus,
): Promise<{ success: boolean; message: string }> {
  const denied = await requireActionAccess(['ADMIN', 'ENTREGADOR']);
  if (denied) return denied;

  if (!deliveryId || !status) {
    return { success: false, message: 'ID da entrega e status são obrigatórios.' };
  }

  if (status === DeliveryStatus.ENTREGUE) {
    return {
      success: false,
      message: 'Use os botões "Entregue pago" ou "Entregue a receber" para registrar o financeiro corretamente.',
    };
  }

  try {
    await prisma.delivery.update({
      where: { id: deliveryId },
      data: { status },
    });

    revalidatePath('/dashboard/entregas');
    revalidatePath(`/dashboard/entregas/${deliveryId}`);

    return { success: true, message: `Status da entrega atualizado para ${status}.` };
  } catch (error) {
    console.error('Database Error:', error);
    return { success: false, message: 'Falha ao atualizar o status da entrega.' };
  }
}

export async function getDeliveryDetails(id: string) {
  try {
    return await prisma.delivery.findUnique({
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
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Falha ao buscar detalhes da entrega.');
  }
}

export async function getOrderById(id: string) {
  try {
    return await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        items: { include: { product: true } },
        debt: true,
        delivery: true,
      },
    });
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Falha ao buscar pedido.');
  }
}

export async function updateDelivery(id: string, data: Prisma.DeliveryUpdateInput) {
  const denied = await requireActionAccess(['ADMIN', 'ENTREGADOR']);
  if (denied) return denied;

  try {
    await prisma.delivery.update({
      where: { id },
      data,
    });

    revalidatePath('/dashboard/entregas');
    revalidatePath(`/dashboard/entregas/${id}`);
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Falha ao atualizar entrega.');
  }
}

export async function markDeliverySentToDriver(
  deliveryId: string,
): Promise<{ success: boolean; message: string }> {
  const denied = await requireActionAccess(['ADMIN', 'ENTREGADOR']);
  if (denied) return denied;

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
  paymentResult: 'PAGO' | 'A_RECEBER',
): Promise<{ success: boolean; message: string }> {
  const denied = await requireActionAccess(['ADMIN', 'ENTREGADOR']);
  if (denied) return denied;

  try {
    await prisma.$transaction(async (tx) => {
      const delivery = await tx.delivery.findUnique({
        where: { id: deliveryId },
        include: { order: { include: { debt: true, customer: true } } },
      });

      if (!delivery) {
        throw new Error('Entrega não encontrada.');
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
          data: {
            status: 'PENDENTE',
            dueDate,
            originalDueDate: delivery.order.debt.originalDueDate ?? delivery.order.debt.dueDate,
            paidAt: null,
          },
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
      message:
        paymentResult === 'PAGO'
          ? 'Entrega confirmada e pagamento marcado como pago.'
          : 'Entrega confirmada e valor registrado a receber.',
    };
  } catch (error) {
    console.error('Database Error:', error);
    return { success: false, message: 'Falha ao confirmar entrega.' };
  }
}
