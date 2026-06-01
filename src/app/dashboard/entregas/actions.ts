'use server';

import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireActionAccess } from '@/lib/api-auth';
import { DeliveryStatus } from '@/types/enums';
import { cleanCustomerTextFields, decodeContactText, normalizeSearchText, onlyDigits } from '@/lib/contact-text';
import { buildBranchWhere } from '@/lib/branch-scope';
import { getCurrentBranchScope } from '@/lib/current-branch-scope';

const ITEMS_PER_PAGE = 15;

function parseFilterDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function cleanDeliveryCustomer<
  T extends {
    order: {
      deliveryAddress?: string | null;
      deliveryReference?: string | null;
      customer: Record<string, unknown>;
    };
  },
>(delivery: T) {
  return {
    ...delivery,
    order: {
      ...delivery.order,
      deliveryAddress: decodeContactText(delivery.order.deliveryAddress),
      deliveryReference: decodeContactText(delivery.order.deliveryReference),
      customer: cleanCustomerTextFields(delivery.order.customer),
    },
  };
}

function deliveryMatchesSearch<
  T extends {
    id: string;
    orderId: string;
    status: string;
    order: {
      paymentMethod: string;
      deliveryAddress?: string | null;
      deliveryReference?: string | null;
      customer: Record<string, unknown>;
    };
  },
>(delivery: T, query: string) {
  const term = normalizeSearchText(query);
  const digits = onlyDigits(query);
  const cleanedDelivery = cleanDeliveryCustomer(delivery);
  const customer = cleanedDelivery.order.customer as {
    name?: string;
    phone?: string;
    street?: string;
    number?: string;
    neighborhood?: string;
    city?: string;
    reference?: string;
  };

  if (!term && !digits) {
    return true;
  }

  const textMatch = [
    delivery.id,
    delivery.orderId,
    delivery.status,
    delivery.order.paymentMethod,
    cleanedDelivery.order.deliveryAddress,
    cleanedDelivery.order.deliveryReference,
    customer.name,
    customer.phone,
    customer.street,
    customer.number,
    customer.neighborhood,
    customer.city,
    customer.reference,
  ]
    .map(normalizeSearchText)
    .some((field) => field.includes(term));
  const phoneMatch = Boolean(digits) && onlyDigits(customer.phone).includes(digits);

  return textMatch || phoneMatch;
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

  const trimmedQuery = query.trim();
  const branchScope = await getCurrentBranchScope();
  const baseWhere: Prisma.DeliveryWhereInput = {
    ...buildBranchWhere(branchScope),
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
  };
  const where: Prisma.DeliveryWhereInput = {
    ...baseWhere,
    ...(trimmedQuery && {
      OR: [
        { order: { customer: { name: { contains: trimmedQuery } } } },
        { order: { customer: { phone: { contains: trimmedQuery } } } },
        { order: { customer: { street: { contains: trimmedQuery } } } },
        { order: { customer: { number: { contains: trimmedQuery } } } },
        { order: { customer: { neighborhood: { contains: trimmedQuery } } } },
        { order: { customer: { city: { contains: trimmedQuery } } } },
        { order: { customer: { reference: { contains: trimmedQuery } } } },
        { order: { deliveryAddress: { contains: trimmedQuery } } },
        { order: { deliveryReference: { contains: trimmedQuery } } },
        { order: { paymentMethod: { contains: trimmedQuery.toUpperCase() } } },
        { status: { contains: trimmedQuery.toUpperCase() } },
        { orderId: { contains: trimmedQuery } },
      ],
    }),
  };
  const include = {
    order: {
      include: {
        customer: true,
        items: { include: { product: true } },
        debt: true,
      },
    },
  } as const;

  try {
    if (trimmedQuery) {
      const allDeliveries = await prisma.delivery.findMany({
        where: baseWhere,
        include,
        orderBy: { createdAt: 'desc' },
      });
      const filteredDeliveries = allDeliveries
        .filter((delivery) => deliveryMatchesSearch(delivery, trimmedQuery))
        .map(cleanDeliveryCustomer);

      return {
        deliveries: filteredDeliveries.slice(offset, offset + ITEMS_PER_PAGE),
        totalPages: Math.ceil(filteredDeliveries.length / ITEMS_PER_PAGE),
      };
    }

    const deliveries = await prisma.delivery.findMany({
      where,
      include,
      orderBy: { createdAt: 'desc' },
      take: ITEMS_PER_PAGE,
      skip: offset,
    });

    const totalDeliveries = await prisma.delivery.count({ where });

    return { deliveries: deliveries.map(cleanDeliveryCustomer), totalPages: Math.ceil(totalDeliveries / ITEMS_PER_PAGE) };
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
    const branchScope = await getCurrentBranchScope();
    const updated = await prisma.delivery.updateMany({
      where: buildBranchWhere(branchScope, { id: deliveryId }),
      data: { status },
    });

    if (updated.count === 0) {
      return { success: false, message: 'Entrega não encontrada para esta filial.' };
    }

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
    const branchScope = await getCurrentBranchScope();
    const delivery = await prisma.delivery.findFirst({
      where: buildBranchWhere(branchScope, { id }),
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

    return delivery ? cleanDeliveryCustomer(delivery) : delivery;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Falha ao buscar detalhes da entrega.');
  }
}

export async function getOrderById(id: string) {
  try {
    const branchScope = await getCurrentBranchScope();
    const order = await prisma.order.findFirst({
      where: buildBranchWhere(branchScope, { id }),
      include: {
        customer: true,
        items: { include: { product: true } },
        debt: true,
        delivery: true,
      },
    });

    return order
      ? {
          ...order,
          deliveryAddress: decodeContactText(order.deliveryAddress),
          deliveryReference: decodeContactText(order.deliveryReference),
          customer: cleanCustomerTextFields(order.customer),
        }
      : order;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Falha ao buscar pedido.');
  }
}

export async function updateDelivery(id: string, data: Prisma.DeliveryUpdateInput) {
  const denied = await requireActionAccess(['ADMIN', 'ENTREGADOR']);
  if (denied) return denied;

  try {
    const branchScope = await getCurrentBranchScope();
    const updated = await prisma.delivery.updateMany({
      where: buildBranchWhere(branchScope, { id }),
      data,
    });

    if (updated.count === 0) {
      throw new Error('Entrega não encontrada para esta filial.');
    }

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
    const branchScope = await getCurrentBranchScope();
    const delivery = await prisma.delivery.findFirst({
      where: buildBranchWhere(branchScope, { id: deliveryId }),
      include: { order: true },
    });

    if (!delivery) {
      return { success: false, message: 'Entrega não encontrada para esta filial.' };
    }

    await prisma.delivery.update({
      where: { id: deliveryId },
      data: { status: DeliveryStatus.EM_ROTA },
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
    const branchScope = await getCurrentBranchScope();
    await prisma.$transaction(async (tx) => {
      const delivery = await tx.delivery.findFirst({
        where: buildBranchWhere(branchScope, { id: deliveryId }),
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

      const dueDate = delivery.order.paymentDueDate
        ? new Date(delivery.order.paymentDueDate)
        : new Date();

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
            branchId: delivery.branchId ?? branchScope.branchId,
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
