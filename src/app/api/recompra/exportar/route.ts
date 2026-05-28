import { addDays, differenceInCalendarDays } from 'date-fns';
import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const REPURCHASE_ORDER_STATUSES = ['CONFIRMADO', 'ENVIADO', 'ENTREGUE'] as const;
const GLOBAL_AVG_INTERVAL_DAYS = 15;

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function calculateAverageInterval(orders: { createdAt: Date }[]) {
  if (orders.length < 2) {
    return GLOBAL_AVG_INTERVAL_DAYS;
  }

  const intervals: number[] = [];

  for (let index = 1; index < orders.length; index += 1) {
    const interval = differenceInCalendarDays(orders[index].createdAt, orders[index - 1].createdAt);
    if (interval > 0) intervals.push(interval);
  }

  if (!intervals.length) {
    return GLOBAL_AVG_INTERVAL_DAYS;
  }

  return Math.max(1, Math.round(intervals.reduce((sum, value) => sum + value, 0) / intervals.length));
}

export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const daysParam = Number(request.nextUrl.searchParams.get('days') ?? '15');
  const days = Number.isFinite(daysParam) && daysParam > 0 ? Math.min(daysParam, 90) : 15;

  const customers = await prisma.customer.findMany({
    include: {
      orders: {
        where: { status: { in: [...REPURCHASE_ORDER_STATUSES] } },
        orderBy: { createdAt: 'asc' },
        include: {
          items: {
            include: {
              product: { select: { name: true } },
            },
          },
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  const predictions = customers
    .map((customer) => {
      if (!customer.orders.length) return null;

      const lastOrder = customer.orders[customer.orders.length - 1];
      const avgInterval = calculateAverageInterval(customer.orders);
      const predictedNextPurchaseDate = addDays(lastOrder.createdAt, avgInterval);
      const daysUntilNextPurchase = differenceInCalendarDays(predictedNextPurchaseDate, new Date());

      if (daysUntilNextPurchase < 0 || daysUntilNextPurchase > days) return null;

      return {
        customer,
        lastOrder,
        avgInterval,
        predictedNextPurchaseDate,
        daysUntilNextPurchase,
      };
    })
    .filter((prediction): prediction is NonNullable<typeof prediction> => Boolean(prediction))
    .sort((a, b) => a.daysUntilNextPurchase - b.daysUntilNextPurchase);

  const header = [
    'cliente',
    'telefone',
    'ultima compra',
    'produto',
    'intervalo medio',
    'previsao',
    'dias ate recompra',
  ];
  const rows = predictions.map((prediction) => [
    prediction.customer.name,
    prediction.customer.phone,
    prediction.lastOrder.createdAt.toLocaleDateString('pt-BR'),
    prediction.lastOrder.items[0]?.product.name ?? '',
    prediction.avgInterval,
    prediction.predictedNextPurchaseDate.toLocaleDateString('pt-BR'),
    prediction.daysUntilNextPurchase <= 0 ? 'hoje' : prediction.daysUntilNextPurchase,
  ]);

  const csv = [
    'sep=;',
    header.map(csvCell).join(';'),
    ...rows.map((row) => row.map(csvCell).join(';')),
  ].join('\r\n');

  const fileDate = new Date().toISOString().slice(0, 10);

  return new NextResponse(`\uFEFF${csv}`, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="recompra-gasparzinho-${fileDate}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
