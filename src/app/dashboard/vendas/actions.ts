'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';

const OrderStatus = {
  PENDENTE: 'PENDENTE',
  CONFIRMADO: 'CONFIRMADO',
  EM_PREPARO: 'EM_PREPARO',
  PRONTO: 'PRONTO',
  ENTREGUE: 'ENTREGUE',
  CANCELADO: 'CANCELADO',
} as const;

const PaymentMethod = {
  DINHEIRO: 'DINHEIRO',
  PIX: 'PIX',
  CARTAO_CREDITO: 'CARTAO_CREDITO',
  CARTAO_DEBITO: 'CARTAO_DEBITO',
  FIADO: 'FIADO',
} as const;

const DebtStatus = {
  PENDENTE: 'PENDENTE',
  PAGO: 'PAGO',
  CANCELADA: 'CANCELADA',
} as const;

const DeliveryStatus = {
  PENDENTE: 'PENDENTE',
  EM_ROTA: 'EM_ROTA',
  ENTREGUE: 'ENTREGUE',
  CANCELADA: 'CANCELADA',
} as const;

const InventoryMovementType = {
  VENDA: 'VENDA',
  CANCELAMENTO: 'CANCELAMENTO',
} as const;

export type OrderSortKey = 'createdAt' | 'customer' | 'status' | 'paymentMethod' | 'grossValue';
export type SortDirection = 'asc' | 'desc';

const orderSortKeys: OrderSortKey[] = [
  'createdAt',
  'customer',
  'status',
  'paymentMethod',
  'grossValue',
];

function normalizeSortKey(sort?: string): OrderSortKey {
  return orderSortKeys.includes(sort as OrderSortKey) ? (sort as OrderSortKey) : 'createdAt';
}

function normalizeSortDirection(direction?: string): SortDirection {
  return direction === 'asc' ? 'asc' : 'desc';
}

function buildOrderBy(sort: OrderSortKey, direction: SortDirection): Prisma.OrderOrderByWithRelationInput {
  if (sort === 'customer') {
    return { customer: { name: direction } };
  }

  if (sort === 'grossValue') {
    return { grossValue: direction };
  }

  if (sort === 'status') {
    return { status: direction };
  }

  if (sort === 'paymentMethod') {
    return { paymentMethod: direction };
  }

  return { createdAt: direction };
}

function parseFilterDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

const OrderItemSchema = z.object({
  productId: z.string().min(1, 'Produto é obrigatório.'),
  quantity: z.coerce
    .number()
    .positive('Quantidade deve ser maior que zero.'),
  unitPrice: z.coerce.number(),
  unitCost: z.coerce.number(),
});

const OrderFormSchema = z.object({
  customerId: z.string().min(1, 'Cliente é obrigatório.'),
  paymentMethod: z.string().min(1, 'Forma de pagamento é obrigatória.'),
  paymentDueDate: z.string().optional(),
  orderStatus: z.string().min(1, 'Status do pedido é obrigatório.'),
  items: z
    .array(OrderItemSchema)
    .min(1, 'O pedido deve ter pelo menos um item.'),
});

export type OrderFormState = {
  success: boolean;
  message: string;
  orderId?: string;
  errors?: z.ZodIssue[];
};

export async function createOrder(
  values: z.infer<typeof OrderFormSchema>,
): Promise<OrderFormState> {
  const validatedFields = OrderFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      success: false,
      message: 'Erro de validação',
      errors: validatedFields.error.issues,
    };
  }

  const { customerId, paymentMethod, paymentDueDate, orderStatus, items } =
    validatedFields.data;

  try {
    const createdOrder = await prisma.$transaction(async (tx) => {
      const requestedByProduct = items.reduce<Record<string, number>>((acc, item) => {
        acc[item.productId] = (acc[item.productId] ?? 0) + item.quantity;
        return acc;
      }, {});

      const products = await tx.product.findMany({
        where: { id: { in: Object.keys(requestedByProduct) } },
        select: { id: true, name: true, inventory: true },
      });

      for (const [productId, requestedQuantity] of Object.entries(requestedByProduct)) {
        const product = products.find((item) => item.id === productId);

        if (!product) {
          throw new Error('Produto não encontrado no estoque.');
        }

        if (product.inventory < requestedQuantity) {
          throw new Error(
            `Estoque insuficiente para ${product.name}. Disponível: ${product.inventory}, solicitado: ${requestedQuantity}.`
          );
        }
      }

      const totalCost = items.reduce(
        (sum, item) => sum + item.unitCost * item.quantity,
        0,
      );

      const grossValue = items.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0,
      );

      const netValue = grossValue - totalCost;

      const order = await tx.order.create({
        data: {
          customerId,
          paymentMethod,
          paymentDueDate: paymentDueDate ? new Date(`${paymentDueDate}T12:00:00`) : null,
          status: orderStatus,
          totalCost,
          grossValue,
          netValue,
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              total: item.unitPrice * item.quantity,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      if (orderStatus === OrderStatus.CONFIRMADO || orderStatus === OrderStatus.PENDENTE) {
        await tx.delivery.create({
          data: {
            orderId: order.id,
            status: DeliveryStatus.PENDENTE,
          },
        });
      }

      if (paymentMethod === PaymentMethod.FIADO) {
        const dueDate = paymentDueDate ? new Date(`${paymentDueDate}T12:00:00`) : new Date();
        if (!paymentDueDate) {
          dueDate.setDate(dueDate.getDate() + 30);
        }

        await tx.debt.create({
          data: {
            customerId,
            orderId: order.id,
            value: grossValue,
            dueDate,
            originalDueDate: dueDate,
            status: DebtStatus.PENDENTE,
          },
        });
      }

      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            inventory: {
              decrement: item.quantity,
            },
          },
        });

        await tx.inventoryMovement.create({
          data: {
            productId: item.productId,
            quantity: -item.quantity,
            type: InventoryMovementType.VENDA,
          },
        });
      }

      return order;
    });

    revalidatePath('/dashboard/vendas');
    revalidatePath('/dashboard/estoque');
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/entregas');

    return {
      success: true,
      message: 'Venda criada com sucesso!',
      orderId: createdOrder.id,
    };
  } catch (error) {
    console.error('Erro na transação ao criar pedido:', error);

    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro no banco de dados ao criar a venda.',
    };
  }
}

export async function updateOrderStatus(
  orderId: string,
  status: keyof typeof OrderStatus,
) {
  try {
    await prisma.order.update({
      where: { id: orderId },
      data: { status },
    });

    revalidatePath('/dashboard/vendas');
    revalidatePath(`/dashboard/vendas/${orderId}`);

    return {
      success: true,
      message: `Status do pedido atualizado para ${status}.`,
    };
  } catch (error) {
    console.error(
      `Erro ao atualizar status do pedido ${orderId}:`,
      error,
    );

    return {
      success: false,
      message: 'Erro ao atualizar o status do pedido.',
    };
  }
}

export async function getPaginatedOrders(
  query: string,
  currentPage: number,
  status?: string,
  date?: string,
  paymentMethod?: string,
  sort?: string,
  direction?: string,
) {
  const ITEMS_PER_PAGE = 10;
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  try {
    const trimmedQuery = query.trim();
    const normalizedQuery = trimmedQuery.toUpperCase();
    const sortKey = normalizeSortKey(sort);
    const sortDirection = normalizeSortDirection(direction);
    const selectedDate = parseFilterDate(date);
    const dayEnd = selectedDate ? new Date(selectedDate) : null;

    if (dayEnd) {
      dayEnd.setHours(23, 59, 59, 999);
    }

    const where: Prisma.OrderWhereInput = {
      ...(trimmedQuery && {
        OR: [
          { customer: { name: { contains: trimmedQuery } } },
          { customer: { phone: { contains: trimmedQuery.replace(/\D/g, '') || trimmedQuery } } },
          { id: { contains: trimmedQuery } },
          { paymentMethod: { contains: normalizedQuery } },
          { status: { contains: normalizedQuery } },
        ],
      }),
      ...(status && status !== 'ALL' && { status }),
      ...(paymentMethod && paymentMethod !== 'ALL' && { paymentMethod }),
      ...(selectedDate && dayEnd && { createdAt: { gte: selectedDate, lte: dayEnd } }),
    };

    const orders = await prisma.order.findMany({
      where,
      include: { customer: true },
      orderBy: buildOrderBy(sortKey, sortDirection),
      take: ITEMS_PER_PAGE,
      skip: offset,
    });

    const count = await prisma.order.count({ where });

    return {
      orders,
      totalPages: Math.ceil(count / ITEMS_PER_PAGE),
    };
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Falha ao buscar pedidos.');
  }
}

export async function getOrderById(id: string) {
  try {
    return await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
          },
        },
        delivery: true,
        debt: true,
      },
    });
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Falha ao buscar detalhes do pedido.');
  }
}

export async function deleteOrder(
  orderId: string,
): Promise<{ success: boolean; message: string }> {
  try {
    const createdOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!order) {
        throw new Error('Pedido não encontrado.');
      }

      if (order.status === OrderStatus.CANCELADO) {
        throw new Error('Este pedido já foi cancelado.');
      }

      await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CANCELADO },
      });

      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            inventory: {
              increment: item.quantity,
            },
          },
        });

        await tx.inventoryMovement.create({
          data: {
            productId: item.productId,
            quantity: item.quantity,
            type: InventoryMovementType.CANCELAMENTO,
          },
        });
      }

      await tx.debt.updateMany({
        where: {
          orderId,
          status: DebtStatus.PENDENTE,
        },
        data: {
          status: DebtStatus.CANCELADA,
        },
      });

      await tx.delivery.updateMany({
        where: { orderId },
        data: {
          status: DeliveryStatus.CANCELADA,
        },
      });
    });

    revalidatePath('/dashboard/vendas');
    revalidatePath(`/dashboard/vendas/${orderId}`);

    return {
      success: true,
      message: 'Pedido cancelado e estoque restaurado com sucesso.',
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Ocorreu um erro ao cancelar o pedido.';

    console.error(error);

    return {
      success: false,
      message,
    };
  }
}

export async function getCustomersForSelect() {
  const customers = await prisma.customer.findMany({
    select: {
      id: true,
      name: true,
      phone: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  return customers;
}

export async function getProductsForSelect() {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      price: true,
      cost: true,
      inventory: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  return products;
}

export const cancelOrder = deleteOrder;
export const getOrderDetails = getOrderById;
