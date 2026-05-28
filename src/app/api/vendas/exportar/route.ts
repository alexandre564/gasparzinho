import { NextResponse } from 'next/server'

import { auth } from '@/auth'
import { deliveryStatusLabels, labelFrom, orderStatusLabels, paymentMethodLabels } from '@/lib/labels'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

export async function GET() {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const orders = await prisma.order.findMany({
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
