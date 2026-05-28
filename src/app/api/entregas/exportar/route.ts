import { NextResponse } from 'next/server'

import { auth } from '@/auth'
import { deliveryStatusLabels, labelFrom, paymentMethodLabels } from '@/lib/labels'
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

  const deliveries = await prisma.delivery.findMany({
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
    const address = [
      customer.street,
      customer.number,
      customer.neighborhood,
      customer.city,
      customer.reference,
    ]
      .filter(Boolean)
      .join(', ')

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
