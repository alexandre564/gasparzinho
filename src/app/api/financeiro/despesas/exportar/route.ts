import { NextRequest, NextResponse } from 'next/server';

import { requireApiAccess } from '@/lib/api-auth';
import { buildBranchWhere } from '@/lib/branch-scope';
import { getCurrentBranchScope } from '@/lib/current-branch-scope';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function parseFilterDate(value?: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET(request: NextRequest) {
  const denied = await requireApiAccess(["ADMIN"]);

  if (denied) {
    return denied;
  }

  const query = request.nextUrl.searchParams.get('query')?.trim() ?? '';
  const category = request.nextUrl.searchParams.get('category')?.trim() ?? '';
  const fromDate = parseFilterDate(request.nextUrl.searchParams.get('from'));
  const toDate = parseFilterDate(request.nextUrl.searchParams.get('to'));
  const branchScope = await getCurrentBranchScope();

  if (toDate) {
    toDate.setHours(23, 59, 59, 999);
  }
  const expenses = await prisma.expense.findMany({
    where: buildBranchWhere(branchScope, {
      ...(query && {
        OR: [
          { description: { contains: query } },
          { category: { contains: query } },
          { subCategory: { contains: query } },
          { paymentMethod: { contains: query } },
          { responsible: { contains: query } },
          { vehicleLabel: { contains: query } },
        ],
      }),
      ...(category && { category }),
      ...(fromDate || toDate
        ? {
            date: {
              ...(fromDate ? { gte: fromDate } : {}),
              ...(toDate ? { lte: toDate } : {}),
            },
          }
        : {}),
    }),
    orderBy: { date: 'desc' },
  });

  const header = ['descricao', 'categoria', 'subcategoria', 'valor', 'data', 'metodo pagamento', 'responsavel', 'veiculo', 'recorrente', 'criado em'];
  const rows = expenses.map((expense) => [
    expense.description,
    expense.category,
    expense.subCategory ?? '',
    expense.value.toFixed(2).replace('.', ','),
    expense.date.toLocaleDateString('pt-BR'),
    expense.paymentMethod ?? '',
    expense.responsible ?? '',
    expense.vehicleLabel ?? '',
    expense.isRecurring ? 'sim' : 'não',
    expense.createdAt.toLocaleDateString('pt-BR'),
  ]);

  const csv = [
    'sep=;',
    header.map(csvCell).join(';'),
    ...rows.map((row) => row.map(csvCell).join(';')),
  ].join('\r\n');

  const fileDate = new Date().toISOString().slice(0, 10);

  return new NextResponse(`\uFEFF${csv}`, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="gastos-gasparzinho-${fileDate}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
