import { NextResponse } from 'next/server'

import { requireApiAccess } from '@/lib/api-auth';

export const dynamic = 'force-dynamic'

const header = ['placa', 'modelo', 'tipo', 'status', 'custo medio km', 'observacoes']

const examples = [
  ['ABC1234', 'Fiat Doblo', 'VAN', 'ATIVO', '1,20', 'Veículo principal de entregas'],
  ['HJK5678', 'Honda CG 160', 'MOTO', 'MANUTENCAO', '0,55', 'Troca de pneus prevista'],
]

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`
}

export async function GET() {
  const denied = await requireApiAccess(['ADMIN'])

  if (denied) {
    return denied
  }

  const csv = [
    'sep=;',
    header.map(csvCell).join(';'),
    ...examples.map((row) => row.map(csvCell).join(';')),
  ].join('\r\n')

  return new NextResponse(`\uFEFF${csv}`, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="modelo-frota-gasparzinho.csv"',
      'Cache-Control': 'no-store',
    },
  })
}
