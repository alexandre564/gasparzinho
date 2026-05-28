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

  const expenses = await prisma.expense.findMany({
    orderBy: { date: 'desc' },
  });

  const header = ['descricao', 'categoria', 'valor', 'data', 'recorrente', 'criado em'];
  const rows = expenses.map((expense) => [
    expense.description,
    expense.category,
    expense.value.toFixed(2).replace('.', ','),
    expense.date.toLocaleDateString('pt-BR'),
    expense.isRecurring ? 'sim' : 'não',
    expense.createdAt.toLocaleDateString('pt-BR'),
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
      'Content-Disposition': `attachment; filename="despesas-gasparzinho-${fileDate}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
