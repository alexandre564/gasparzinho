import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

import { requireApiAccess } from '@/lib/api-auth';
import { buildBranchWhere } from '@/lib/branch-scope'
import { deliveryStatusLabels, labelFrom, paymentMethodLabels } from '@/lib/labels'
import { prisma } from '@/lib/prisma'
import { cleanCustomerTextFields, decodeContactText, normalizeSearchText, onlyDigits } from '@/lib/contact-text'
import { getCurrentBranchScope } from '@/lib/current-branch-scope'

export const dynamic = 'force-dynamic'

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

function parseFilterDate(value?: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null
  }

  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function cleanDeliveryCustomer<
  T extends {
    order: {
      deliveryAddress?: string | null
      deliveryReference?: string | null
      customer: Record<string, unknown>
    }
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
  }
}

function deliveryMatchesSearch<
  T extends {
    id: string
    orderId: string
    status: string
    order: {
      paymentMethod: string
      deliveryAddress?: string | null
      deliveryReference?: string | null
      customer: Record<string, unknown>
    }
  },
>(delivery: T, query: string) {
  const term = normalizeSearchText(query)
  const digits = onlyDigits(query)
  const cleanedDelivery = cleanDeliveryCustomer(delivery)
  const customer = cleanedDelivery.order.customer as {
    name?: string
    phone?: string
    street?: string
    number?: string
    neighborhood?: string
    city?: string
    reference?: string
  }

  if (!term && !digits) {
    return true
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
    .some((field) => field.includes(term))
  const phoneMatch = Boolean(digits) && onlyDigits(customer.phone).includes(digits)

  return textMatch || phoneMatch
}

export async function GET(request: NextRequest) {
  const denied = await requireApiAccess(['ADMIN', 'ENTREGADOR'])

  if (denied) {
    return denied
  }

  const query = request.nextUrl.searchParams.get('query')?.trim() ?? ''
  const status = request.nextUrl.searchParams.get('status')?.trim() ?? ''
  const fromDate = parseFilterDate(request.nextUrl.searchParams.get('from'))
  const toDate = parseFilterDate(request.nextUrl.searchParams.get('to'))
  const branchScope = await getCurrentBranchScope()

  if (toDate) {
    toDate.setHours(23, 59, 59, 999)
  }

  const baseWhere: Prisma.DeliveryWhereInput = {
    ...buildBranchWhere(branchScope),
    ...(status && status !== 'TODOS' && { status }),
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
  }
  const where: Prisma.DeliveryWhereInput = {
    ...baseWhere,
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
  }

  const rawDeliveries = await prisma.delivery.findMany({
    where: query ? baseWhere : where,
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
  })
  const deliveries = (query
    ? rawDeliveries.filter((delivery) => deliveryMatchesSearch(delivery, query))
    : rawDeliveries
  ).map(cleanDeliveryCustomer)

  const header = [
    'data',
    'cliente',
    'telefone',
    'endereco',
    'status entrega',
    'pagamento',
    'itens',
    'valor',
    'divida',
  ]

  const rows = deliveries.map((delivery) => {
    const customer = delivery.order.customer
    const fallbackAddress = [
      customer.street,
      customer.number,
      customer.neighborhood,
      customer.city,
      customer.reference,
    ]
      .filter(Boolean)
      .join(', ')
    const address = delivery.order.deliveryAddress || fallbackAddress

    return [
      delivery.order.createdAt.toLocaleDateString('pt-BR'),
      customer.name,
      customer.phone,
      address,
      labelFrom(deliveryStatusLabels, delivery.status),
      labelFrom(paymentMethodLabels, delivery.order.paymentMethod),
      delivery.order.items
        .map((item) => `${item.quantity}x ${item.product?.name ?? 'Produto removido'}`)
        .join(' | '),
      delivery.order.grossValue.toFixed(2).replace('.', ','),
      delivery.order.debt
        ? `${delivery.order.debt.status} ${delivery.order.debt.value.toFixed(2).replace('.', ',')}`
        : '',
    ]
  })

  const csv = [
    'sep=;',
    header.map(csvCell).join(';'),
    ...rows.map((row) => row.map(csvCell).join(';')),
  ].join('\r\n')

  const fileDate = new Date().toISOString().slice(0, 10)

  return new NextResponse(`\uFEFF${csv}`, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="entregas-gasparzinho-${fileDate}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
