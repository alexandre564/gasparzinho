import { endOfDay, endOfMonth, endOfWeek, startOfDay, startOfMonth, startOfWeek } from 'date-fns';
import { NextResponse } from 'next/server';

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

export async function GET() {
  const denied = await requireApiAccess(["ADMIN"]);

  if (denied) {
    return denied;
  }

  const now = new Date();
  const periods = [
    { name: 'hoje', from: startOfDay(now), to: endOfDay(now) },
    { name: 'semana', from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) },
    { name: 'mes', from: startOfMonth(now), to: endOfMonth(now) },
  ];

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
    ['periodo', 'entradas', 'despesas', 'saldo'].map(csvCell).join(';'),
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
