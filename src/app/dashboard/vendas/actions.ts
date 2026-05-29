'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireActionAccess } from '@/lib/api-auth';
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

function hasDeliveryAddressNumber(value: string | null | undefined) {
  const address = value ?? '';
  return (
    /,\s*(\d+[A-Za-z]?|s\/n|sn)\b/i.test(address) ||
    /\b(n[ºo]?|numero|número)\s*[:.]?\s*(\d+[A-Za-z]?|s\/n|sn)\b/i.test(address)
  );
}

const OrderFormSchema = z.object({
  customerId: z.string().min(1, 'Cliente é obrigatório.'),
  paymentMethod: z.string().min(1, 'Forma de pagamento é obrigatória.'),
  paymentDueDate: z.string().optional(),
  orderStatus: z.string().min(1, 'Status do pedido é obrigatório.'),
  deliveryAddress: z.string().trim().max(500, 'Endereço muito longo.').optional(),
  deliveryReference: z.string().trim().max(250, 'Referência muito longa.').optional(),
  deliveryAddressChanged: z.boolean().default(false),
  saveDeliveryAddressToCustomer: z.boolean().default(false),
  items: z
    .array(OrderItemSchema)
    .min(1, 'O pedido deve ter pelo menos um item.'),
}).superRefine((values, context) => {
  if (values.deliveryAddressChanged && !hasDeliveryAddressNumber(values.deliveryAddress)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['deliveryAddress'],
      message: 'Informe o número do endereço para o Maps/Waze localizar corretamente.',
    });
  }
});

type CustomerAddressFallback = {
  street: string;
  number: string;
  complement?: string | null;
  neighborhood: string;
  city: string;
  cep?: string | null;
};

function cleanAddressPart(value: string | null | undefined) {
  return (value ?? '')
    .replace(/\s+/g, ' ')
    .replace(/^[,\s-]+|[,\s-]+$/g, '')
    .trim();
}

function parseDeliveryAddressForCustomer(address: string, fallback: CustomerAddressFallback) {
  const cepMatch = address.match(/\b(?:CEP\s*)?(\d{5}-?\d{3})\b/i);
  const cep = cepMatch?.[1]?.replace(/\D/g, '') || fallback.cep || '';
  const addressWithoutCep = address.replace(/\bCEP\s*\d{5}-?\d{3}\b/gi, '').trim();
  const dashedParts = addressWithoutCep.split(/\s+-\s+/).map(cleanAddressPart).filter(Boolean);
  const commaParts = addressWithoutCep.split(',').map(cleanAddressPart).filter(Boolean);
  const parts = dashedParts.length > 1 ? dashedParts : commaParts;
  const firstPart = parts[0] ?? addressWithoutCep;
  let street = fallback.street;
  let number = fallback.number;
  let neighborhood = fallback.neighborhood;
  let city = fallback.city || 'Lavras';
  let complement = fallback.complement ?? '';

  if (dashedParts.length > 1) {
    const streetNumberMatch = firstPart.match(/^(.+?),\s*(.+)$/);
    street = cleanAddressPart(streetNumberMatch?.[1] ?? firstPart) || fallback.street;
    const parsedNumber = cleanAddressPart(streetNumberMatch?.[2]);
    number = parsedNumber && !/^n[uú]mero$/i.test(parsedNumber) ? parsedNumber : fallback.number || 'S/N';
    neighborhood = cleanAddressPart(parts[1]) || fallback.neighborhood;
    city = cleanAddressPart((parts[2] ?? fallback.city).split('/')[0]) || fallback.city || 'Lavras';
    complement = cleanAddressPart(parts.slice(3).filter((part) => !/^cep\b/i.test(part)).join(' - '));
  } else if (commaParts.length >= 2) {
    street = cleanAddressPart(commaParts[0]) || fallback.street;
    const parsedNumber = cleanAddressPart(commaParts[1]);
    number = parsedNumber && !/^n[uú]mero$/i.test(parsedNumber) ? parsedNumber : fallback.number || 'S/N';
    neighborhood = cleanAddressPart(commaParts[2]) || fallback.neighborhood;
    city = cleanAddressPart((commaParts[3] ?? fallback.city).split('/')[0]) || fallback.city || 'Lavras';
    complement = cleanAddressPart(commaParts.slice(4).join(', '));
  }

  return {
    street,
    number,
    complement: complement || null,
    neighborhood,
    city,
    cep,
  };
}

export type OrderFormState = {
  success: boolean;
  message: string;
  orderId?: string;
  errors?: z.ZodIssue[];
};

export async function createOrder(
  values: z.infer<typeof OrderFormSchema>,
): Promise<OrderFormState> {
  const denied = await requireActionAccess(['ADMIN', 'VENDEDOR']);
  if (denied) return denied;

  const validatedFields = OrderFormSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      success: false,
      message: 'Erro de validação',
      errors: validatedFields.error.issues,
    };
  }

  const {
    customerId,
    paymentMethod,
    paymentDueDate,
    orderStatus,
    deliveryAddress,
    deliveryReference,
    deliveryAddressChanged,
    saveDeliveryAddressToCustomer,
    items,
  } = validatedFields.data;

  try {
    const createdOrder = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({
        where: { id: customerId },
        select: {
          street: true,
          number: true,
          complement: true,
          neighborhood: true,
          city: true,
          cep: true,
          reference: true,
        },
      });

      if (!customer) {
        throw new Error('Cliente não encontrado.');
      }

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
      const defaultDeliveryAddress = [
        `${customer.street}, ${customer.number}`,
        customer.complement,
        customer.neighborhood,
        customer.city,
        customer.cep ? `CEP ${customer.cep}` : null,
      ]
        .filter(Boolean)
        .join(' - ');
      const selectedDeliveryAddress = deliveryAddress?.trim() || defaultDeliveryAddress;
      const selectedDeliveryReference = deliveryReference?.trim() || customer.reference || null;

      const order = await tx.order.create({
        data: {
          customerId,
          paymentMethod,
          paymentDueDate: paymentDueDate ? new Date(`${paymentDueDate}T12:00:00`) : null,
          deliveryAddress: selectedDeliveryAddress,
          deliveryReference: selectedDeliveryReference,
          deliveryAddressChanged,
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

      if (deliveryAddressChanged && saveDeliveryAddressToCustomer && selectedDeliveryAddress) {
        const parsedAddress = parseDeliveryAddressForCustomer(selectedDeliveryAddress, customer);

        await tx.customer.update({
          where: { id: customerId },
          data: {
            street: parsedAddress.street,
            number: parsedAddress.number,
            complement: parsedAddress.complement,
            neighborhood: parsedAddress.neighborhood,
            city: parsedAddress.city,
            cep: parsedAddress.cep,
            reference: selectedDeliveryReference,
          },
        });
      }

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
    revalidatePath('/dashboard/cobranca');
    revalidatePath('/dashboard/financeiro');
    revalidatePath('/dashboard/financeiro/dividas');

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
  const denied = await requireActionAccess(['ADMIN', 'VENDEDOR']);
  if (denied) return denied;

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
  const denied = await requireActionAccess(['ADMIN', 'VENDEDOR']);
  if (denied) return denied;

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
      street: true,
      number: true,
      complement: true,
      neighborhood: true,
      city: true,
      cep: true,
      reference: true,
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
