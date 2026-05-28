import { NextResponse } from 'next/server';
import { requireApiAccess } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

const header = [
  'cliente',
  'telefone',
  'valor para pagamento',
  'vencimento',
  'status',
  'pagamento',
  'renegociado em',
  'valor renegociado',
  'observacoes',
];

const example = [
  'Cliente Exemplo',
  '35999999999',
  '115,00',
  '30/05/2026',
  'PENDENTE',
  '',
  '',
  '',
  'Combinar pagamento pelo WhatsApp',
];

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export async function GET() {
  const denied = await requireApiAccess(["ADMIN"]);

  if (denied) {
    return denied;
  }

  const csv = ['sep=;', header.map(csvCell).join(';'), example.map(csvCell).join(';')].join('\r\n');

  return new NextResponse(`\uFEFF${csv}`, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="modelo-cobrancas-gasparzinho.csv"',
      'Cache-Control': 'no-store',
    },
  });
}
