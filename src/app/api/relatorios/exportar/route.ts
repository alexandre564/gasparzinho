import { NextRequest, NextResponse } from 'next/server';

import { requireApiAccess } from '@/lib/api-auth';
import { getSalesReportData, type ReportPeriod } from '@/app/dashboard/relatorios/actions';

export const dynamic = 'force-dynamic';

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function getPeriod(value: string | null): ReportPeriod {
  return value === 'monthly' ? 'monthly' : 'daily';
}

export async function GET(request: NextRequest) {
  const denied = await requireApiAccess(["ADMIN"]);

  if (denied) {
    return denied;
  }

  const period = getPeriod(request.nextUrl.searchParams.get('period'));
  const points = await getSalesReportData(period);
  const total = points.reduce((sum, point) => sum + point.total, 0);
  const expenses = points.reduce((sum, point) => sum + point.expenses, 0);
  const ordersCount = points.reduce((sum, point) => sum + point.ordersCount, 0);
  const net = total - expenses;
  const averageTicket = ordersCount > 0 ? total / ordersCount : 0;

  const header = ['periodo', 'entradas', 'despesas', 'saldo', 'pedidos', 'ticket medio'];
  const rows = points.map((point) => [
    point.name,
    point.total.toFixed(2).replace('.', ','),
    point.expenses.toFixed(2).replace('.', ','),
    point.net.toFixed(2).replace('.', ','),
    point.ordersCount,
    point.avgTicket.toFixed(2).replace('.', ','),
  ]);
  const summaryRows = [
    ['total entradas', total.toFixed(2).replace('.', ',')],
    ['total despesas', expenses.toFixed(2).replace('.', ',')],
    ['saldo', net.toFixed(2).replace('.', ',')],
    ['pedidos', ordersCount],
    ['ticket medio', averageTicket.toFixed(2).replace('.', ',')],
  ];

  const csv = [
    'sep=;',
    header.map(csvCell).join(';'),
    ...rows.map((row) => row.map(csvCell).join(';')),
    '',
    ...summaryRows.map((row) => row.map(csvCell).join(';')),
  ].join('\r\n');

  const fileDate = new Date().toISOString().slice(0, 10);
  const periodName = period === 'monthly' ? 'mensal' : 'diario';

  return new NextResponse(`\uFEFF${csv}`, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="relatorio-${periodName}-gasparzinho-${fileDate}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
