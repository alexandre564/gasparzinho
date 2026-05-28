import { addDays, differenceInCalendarDays } from 'date-fns';
import { NextRequest, NextResponse } from 'next/server';

import { requireApiAccess } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const REPURCHASE_ORDER_STATUSES = ['CONFIRMADO', 'ENVIADO', 'ENTREGUE', 'CONCLUIDO'] as const;
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

function normalizeText(value: string | null | undefined) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function onlyDigits(value: string | null | undefined) {
  return (value ?? '').replace(/\D/g, '');
}

export async function GET(request: NextRequest) {
  const denied = await requireApiAccess(["ADMIN","VENDEDOR"]);

  if (denied) {
    return denied;
  }

  const daysParam = Number(request.nextUrl.searchParams.get('days') ?? '15');
  const days = Number.isFinite(daysParam) && daysParam > 0 ? Math.min(daysParam, 90) : 15;
  const query = request.nextUrl.searchParams.get('query')?.trim() ?? '';

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
      const term = normalizeText(query);
      const digits = onlyDigits(query);
      const textMatch = [
        customer.name,
        customer.phone,
        customer.city,
        lastOrder.items[0]?.product.name,
      ]
        .map(normalizeText)
        .some((value) => value.includes(term));
      const phoneMatch = Boolean(digits) && onlyDigits(customer.phone).includes(digits);

      if (daysUntilNextPurchase < 0 || daysUntilNextPurchase > days) return null;
      if ((term || digits) && !textMatch && !phoneMatch) return null;

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
