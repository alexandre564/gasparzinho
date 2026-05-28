import { NextResponse } from 'next/server'

import { auth } from '@/auth'
import { labelFrom, vehicleStatusLabels, vehicleTypeLabels } from '@/lib/labels'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

export async function GET() {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const vehicles = await prisma.vehicle.findMany({
    orderBy: { placa: 'asc' },
  })

  const header = ['placa', 'modelo', 'tipo', 'status', 'custo medio km', 'observacoes', 'criado em']
  const rows = vehicles.map((vehicle) => [
    vehicle.placa,
    vehicle.modelo,
    labelFrom(vehicleTypeLabels, vehicle.tipo),
    labelFrom(vehicleStatusLabels, vehicle.status),
    vehicle.custoMedioKm.toFixed(2).replace('.', ','),
    vehicle.observacoes,
    vehicle.createdAt.toLocaleDateString('pt-BR'),
  ])

  const csv = [
    'sep=;',
    header.map(csvCell).join(';'),
    ...rows.map((row) => row.map(csvCell).join(';')),
  ].join('\r\n')

  const fileDate = new Date().toISOString().slice(0, 10)

  return new NextResponse(`\uFEFF${csv}`, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="frota-gasparzinho-${fileDate}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
