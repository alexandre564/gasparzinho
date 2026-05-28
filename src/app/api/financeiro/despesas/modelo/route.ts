import { NextResponse } from 'next/server';

import { requireApiAccess } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

const header = ['descricao', 'categoria', 'valor', 'data', 'recorrente'];

const examples = [
  ['Combustível entrega', 'Transporte', '75,00', '28/05/2026', 'não'],
  ['Salário entregador', 'Salário', '1800,00', '28/05/2026', 'sim'],
];

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export async function GET() {
  const denied = await requireApiAccess(["ADMIN"]);

  if (denied) {
    return denied;
  }

  const csv = [
    'sep=;',
    header.map(csvCell).join(';'),
    ...examples.map((row) => row.map(csvCell).join(';')),
  ].join('\r\n');

  return new NextResponse(`\uFEFF${csv}`, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="modelo-despesas-gasparzinho.csv"',
      'Cache-Control': 'no-store',
    },
  });
}
