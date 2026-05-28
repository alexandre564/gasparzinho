import { endOfDay, startOfDay } from 'date-fns';
import { NextRequest, NextResponse } from 'next/server';

import { requireApiAccess } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function parseFilterDate(value?: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(request: NextRequest) {
  const denied = await requireApiAccess(["ADMIN"]);

  if (denied) {
    return denied;
  }

  const fromDate = parseFilterDate(request.nextUrl.searchParams.get('from'));
  const toDate = parseFilterDate(request.nextUrl.searchParams.get('to'));
  const endDate = toDate ? endOfDay(toDate) : null;
  const closings = await prisma.dailyClosing.findMany({
    where: {
      ...(fromDate || endDate
        ? {
            date: {
              ...(fromDate ? { gte: startOfDay(fromDate) } : {}),
              ...(endDate ? { lte: endDate } : {}),
            },
          }
        : {}),
    },
    orderBy: { date: 'desc' },
    take: 365,
  });

  const header = ['data', 'vendas', 'entradas', 'despesas', 'saldo liquido', 'observacoes'];
  const rows = closings.map((closing) => [
    closing.date.toLocaleDateString('pt-BR'),
    closing.ordersCount,
    Number(closing.totalRevenue).toFixed(2).replace('.', ','),
    Number(closing.totalExpenses).toFixed(2).replace('.', ','),
    Number(closing.netBalance).toFixed(2).replace('.', ','),
    closing.notes ?? '',
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
      'Content-Disposition': `attachment; filename="fechamentos-gasparzinho-${fileDate}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
