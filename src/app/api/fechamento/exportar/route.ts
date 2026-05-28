import { NextResponse } from 'next/server';

import { requireApiAccess } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET() {
  const denied = await requireApiAccess(["ADMIN"]);

  if (denied) {
    return denied;
  }

  const closings = await prisma.dailyClosing.findMany({
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
