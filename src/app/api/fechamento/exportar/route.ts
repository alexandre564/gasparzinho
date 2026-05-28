import { NextResponse } from 'next/server';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
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
