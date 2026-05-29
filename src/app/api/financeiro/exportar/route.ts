import { endOfDay, endOfMonth, endOfWeek, endOfYear, startOfDay, startOfMonth, startOfWeek, startOfYear } from 'date-fns';
import { NextRequest, NextResponse } from 'next/server';

import { requireApiAccess } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

async function getRevenue(from: Date, to: Date) {
  const result = await prisma.order.aggregate({
    _sum: { grossValue: true },
    where: { createdAt: { gte: from, lte: to }, status: { not: 'CANCELADO' } },
  });

  return result._sum.grossValue ?? 0;
}

async function getExpenses(from: Date, to: Date) {
  const result = await prisma.expense.aggregate({
    _sum: { value: true },
    where: { date: { gte: from, lte: to } },
  });

  return result._sum.value ?? 0;
}

function getSelectedPeriod(period: string | null, now = new Date()) {
  if (period === 'daily') {
    return [{ name: 'dia', from: startOfDay(now), to: endOfDay(now) }];
  }

  if (period === 'weekly') {
    return [{ name: 'semana', from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) }];
  }

  if (period === 'yearly') {
    return [{ name: 'ano', from: startOfYear(now), to: endOfYear(now) }];
  }

  if (period === 'monthly') {
    return [{ name: 'mes', from: startOfMonth(now), to: endOfMonth(now) }];
  }

  return [
    { name: 'hoje', from: startOfDay(now), to: endOfDay(now) },
    { name: 'semana', from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) },
    { name: 'mes', from: startOfMonth(now), to: endOfMonth(now) },
    { name: 'ano', from: startOfYear(now), to: endOfYear(now) },
  ];
}

export async function GET(request: NextRequest) {
  const denied = await requireApiAccess(["ADMIN"]);

  if (denied) {
    return denied;
  }

  const now = new Date();
  const periods = getSelectedPeriod(request.nextUrl.searchParams.get('period'), now);

  const rows = await Promise.all(
    periods.map(async (period) => {
      const [revenue, expenses] = await Promise.all([
        getRevenue(period.from, period.to),
        getExpenses(period.from, period.to),
      ]);

      return [
        period.name,
        revenue.toFixed(2).replace('.', ','),
        expenses.toFixed(2).replace('.', ','),
        (revenue - expenses).toFixed(2).replace('.', ','),
      ];
    }),
  );

  const csv = [
    'sep=;',
    ['periodo', 'entradas', 'gastos', 'saldo'].map(csvCell).join(';'),
    ...rows.map((row) => row.map(csvCell).join(';')),
  ].join('\r\n');

  const fileDate = new Date().toISOString().slice(0, 10);

  return new NextResponse(`\uFEFF${csv}`, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="financeiro-gasparzinho-${fileDate}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
