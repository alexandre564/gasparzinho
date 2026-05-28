import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

import { auth } from '@/auth'
import { deliveryStatusLabels, labelFrom, orderStatusLabels, paymentMethodLabels } from '@/lib/labels'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

function parseFilterDate(value: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null
  }

  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

export async function GET(request: NextRequest) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const query = request.nextUrl.searchParams.get('query')?.trim() ?? ''
  const status = request.nextUrl.searchParams.get('status')?.trim() ?? ''
  const date = request.nextUrl.searchParams.get('date')?.trim() ?? ''
  const selectedDate = parseFilterDate(date)
  const dayEnd = selectedDate ? new Date(selectedDate) : null

  if (dayEnd) {
    dayEnd.setHours(23, 59, 59, 999)
  }

  const where: Prisma.OrderWhereInput = {
    ...(query && {
      OR: [
        { customer: { name: { contains: query } } },
        { id: { contains: query } },
      ],
    }),
    ...(status && status !== 'ALL' && { status }),
    ...(selectedDate && dayEnd && { createdAt: { gte: selectedDate, lte: dayEnd } }),
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      customer: true,
      items: {
        include: {
          product: true,
        },
      },
      debt: true,
      delivery: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  const header = [
    'pedido',
    'data',
    'cliente',
    'telefone',
    'status',
    'pagamento',
    'entrega',
    'itens',
    'valor bruto',
    'custo',
    'valor liquido',
    'vencimento',
    'divida',
  ]

  const rows = orders.map((order) => [
    order.id,
    order.createdAt.toLocaleDateString('pt-BR'),
    order.customer.name,
    order.customer.phone,
    labelFrom(orderStatusLabels, order.status),
    labelFrom(paymentMethodLabels, order.paymentMethod),
    order.delivery ? labelFrom(deliveryStatusLabels, order.delivery.status) : '',
    order.items
      .map((item) => `${item.quantity}x ${item.product?.name ?? 'Produto removido'}`)
      .join(' | '),
    order.grossValue.toFixed(2).replace('.', ','),
    order.totalCost.toFixed(2).replace('.', ','),
    order.netValue.toFixed(2).replace('.', ','),
    order.paymentDueDate?.toLocaleDateString('pt-BR') ?? '',
    order.debt ? `${order.debt.status} ${order.debt.value.toFixed(2).replace('.', ',')}` : '',
  ])

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
      'Content-Disposition': `attachment; filename="vendas-gasparzinho-${fileDate}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
