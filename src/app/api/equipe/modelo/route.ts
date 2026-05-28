import { NextResponse } from 'next/server';

import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

const header = ['nome', 'email', 'nivel de acesso', 'situacao', 'senha'];

const examples = [
  ['Alexandre Admin', 'admin@gasparzinho.com', 'Administrador', 'ativo', 'senha123'],
  ['Entregador Exemplo', 'entregador@gasparzinho.com', 'Entregador', 'ativo', 'senha123'],
];

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
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
      'Content-Disposition': 'attachment; filename="modelo-equipe-gasparzinho.csv"',
      'Cache-Control': 'no-store',
    },
  });
}
