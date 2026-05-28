import { NextResponse } from 'next/server';
import { requireApiAccess } from '@/lib/api-auth';

export const dynamic = 'force-dynamic';

const header = [
  'nome',
  'telefone',
  'cep',
  'rua',
  'numero',
  'complemento',
  'bairro',
  'cidade',
  'referencia',
  'observacoes',
];

const example = [
  'Cliente Exemplo',
  '35999999999',
  '37200000',
  'Rua Exemplo',
  '123',
  'Casa',
  'Centro',
  'Lavras',
  'Próximo à praça',
  'Cliente importado por planilha',
];

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

export async function GET() {
  const denied = await requireApiAccess(["ADMIN","VENDEDOR"]);

  if (denied) {
    return denied;
  }

  const csv = ['sep=;', header.map(csvCell).join(';'), example.map(csvCell).join(';')].join('\r\n');

  return new NextResponse(`\uFEFF${csv}`, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="modelo-clientes-gasparzinho.csv"',
      'Cache-Control': 'no-store',
    },
  });
}
