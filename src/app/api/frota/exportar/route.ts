import { NextRequest, NextResponse } from 'next/server'

import { requireApiAccess } from '@/lib/api-auth';
import { labelFrom, vehicleStatusLabels, vehicleTypeLabels } from '@/lib/labels'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

function normalizeText(value: string | null | undefined) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export async function GET(request: NextRequest) {
  const denied = await requireApiAccess(['ADMIN'])

  if (denied) {
    return denied
  }

  const query = normalizeText(request.nextUrl.searchParams.get('query'))
  const status = request.nextUrl.searchParams.get('status')?.trim() ?? ''
  const type = request.nextUrl.searchParams.get('type')?.trim() ?? ''
  const vehicles = await prisma.vehicle.findMany({
    orderBy: { placa: 'asc' },
  })
  const filteredVehicles = vehicles.filter((vehicle) => {
    if (status && vehicle.status !== status) return false
    if (type && vehicle.tipo !== type) return false
    if (!query) return true

    return (
        [
          vehicle.placa,
          vehicle.modelo,
          vehicle.tipo,
          vehicle.status,
          vehicle.observacoes ?? '',
          labelFrom(vehicleTypeLabels, vehicle.tipo),
          labelFrom(vehicleStatusLabels, vehicle.status),
        ]
          .map(normalizeText)
          .some((value) => value.includes(query))
    )
  })

  const header = ['placa', 'modelo', 'tipo', 'status', 'custo medio km', 'observacoes', 'criado em']
  const rows = filteredVehicles.map((vehicle) => [
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
