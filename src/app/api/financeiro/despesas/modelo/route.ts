import { NextResponse } from 'next/server';

import { requireApiAccess } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

const header = ['descricao', 'categoria', 'subcategoria', 'valor', 'data', 'metodo pagamento', 'responsavel', 'veiculo', 'recorrente'];

const examples = [
  ['Combustivel entrega', 'Frota/Veiculos', 'Combustivel', '75,00', '28/05/2026', 'Pix', 'Alexandre', 'Moto 01', 'nao'],
  ['Internet loja', 'Despesas Fixas', 'Internet', '120,00', '28/05/2026', 'Boleto', 'Alexandre', '', 'sim'],
];

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export async function GET() {
  const denied = await requireApiAccess(['ADMIN']);

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
      'Content-Disposition': 'attachment; filename="modelo-gastos-gasparzinho.csv"',
      'Cache-Control': 'no-store',
    },
  });
}
