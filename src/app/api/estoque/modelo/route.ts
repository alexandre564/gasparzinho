import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export const dynamic = 'force-dynamic';

const header = [
  'nome',
  'descricao',
  'preco venda',
  'custo',
  'categoria',
  'tipo estoque',
  'saldo',
];

const examples = [
  ['Botijão P13', 'Gás de cozinha 13kg', '115,00', '92,00', 'BOTIJAO', 'CHEIO_VAZIO', '20'],
  ['Água mineral 20L', 'Galão de água retornável', '18,00', '9,00', 'AGUA', 'UNIDADE', '30'],
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
      'Content-Disposition': 'attachment; filename="modelo-produtos-gasparzinho.csv"',
      'Cache-Control': 'no-store',
    },
  });
}
