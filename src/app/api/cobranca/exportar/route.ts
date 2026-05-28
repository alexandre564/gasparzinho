import { NextRequest, NextResponse } from 'next/server';
import { requireApiAccess } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function formatDate(value?: Date | null) {
  return value ? value.toLocaleDateString('pt-BR') : '';
}

function daysLate(dueDate: Date, paidAt?: Date | null) {
  const due = new Date(dueDate);
  const reference = paidAt ? new Date(paidAt) : new Date();
  due.setHours(0, 0, 0, 0);
  reference.setHours(0, 0, 0, 0);

  return Math.max(Math.floor((reference.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)), 0);
}

function normalizeText(value: string | null | undefined) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function onlyDigits(value: string | null | undefined) {
  return (value ?? '').replace(/\D/g, '');
}

type ExportDebt = Awaited<ReturnType<typeof prisma.debt.findMany>>[number] & {
  customer: { name: string; phone: string };
  order: { id: string; createdAt: Date; paymentMethod: string } | null;
};

const debtSortKeys = ['customer', 'phone', 'value', 'dueDate', 'daysLate', 'status', 'paidAt'] as const;
const debtStatusFilterValues = ['PENDENTE', 'VENCIDO', 'RENEGOCIADO', 'PAGO'] as const;
type DebtSortKey = (typeof debtSortKeys)[number];
type SortDirection = 'asc' | 'desc';

function debtMatchesSearch(debt: ExportDebt, query: string) {
  const term = normalizeText(query);
  const digits = onlyDigits(query);

  if (!term && !digits) return true;

  const textMatch = [debt.customer.name, debt.customer.phone, debt.status, debt.notes, debt.id]
    .map(normalizeText)
    .some((value) => value.includes(term));
  const phoneMatch = Boolean(digits) && onlyDigits(debt.customer.phone).includes(digits);

  return textMatch || phoneMatch;
}

function normalizeSortKey(sort?: string | null): DebtSortKey {
  return debtSortKeys.includes(sort as DebtSortKey) ? (sort as DebtSortKey) : 'dueDate';
}

function normalizeSortDirection(direction?: string | null): SortDirection {
  return direction === 'desc' ? 'desc' : 'asc';
}

function normalizeStatusFilter(status?: string | null) {
  return debtStatusFilterValues.includes(status as (typeof debtStatusFilterValues)[number])
    ? status
    : undefined;
}

function paymentValue(debt: ExportDebt) {
  return debt.renegotiatedValue ?? debt.value;
}

function compareNullableNumber(
  left: number | null | undefined,
  right: number | null | undefined,
  direction: SortDirection,
) {
  const leftMissing = left === null || left === undefined;
  const rightMissing = right === null || right === undefined;

  if (leftMissing && rightMissing) return 0;
  if (leftMissing) return 1;
  if (rightMissing) return -1;

  const result = left === right ? 0 : left < right ? -1 : 1;
  return direction === 'asc' ? result : -result;
}

function compareDebts(left: ExportDebt, right: ExportDebt, sort: DebtSortKey, direction: SortDirection) {
  if (sort === 'customer') {
    const result = left.customer.name.localeCompare(right.customer.name, 'pt-BR', { sensitivity: 'base' });
    return direction === 'asc' ? result : -result;
  }

  if (sort === 'phone') {
    const result = left.customer.phone.localeCompare(right.customer.phone, 'pt-BR', { sensitivity: 'base' });
    return direction === 'asc' ? result : -result;
  }

  if (sort === 'status') {
    const result = left.status.localeCompare(right.status, 'pt-BR', { sensitivity: 'base' });
    return direction === 'asc' ? result : -result;
  }

  if (sort === 'value') {
    return compareNullableNumber(paymentValue(left), paymentValue(right), direction);
  }

  if (sort === 'daysLate') {
    return compareNullableNumber(daysLate(left.dueDate, left.paidAt), daysLate(right.dueDate, right.paidAt), direction);
  }

  if (sort === 'paidAt') {
    return compareNullableNumber(left.paidAt?.getTime(), right.paidAt?.getTime(), direction);
  }

  return compareNullableNumber(left.dueDate.getTime(), right.dueDate.getTime(), direction);
}

export async function GET(request: NextRequest) {
  const denied = await requireApiAccess(["ADMIN"]);

  if (denied) {
    return denied;
  }

  const query = request.nextUrl.searchParams.get('query')?.trim() ?? '';
  const status = normalizeStatusFilter(request.nextUrl.searchParams.get('status')?.trim());
  const sort = normalizeSortKey(request.nextUrl.searchParams.get('sort'));
  const direction = normalizeSortDirection(request.nextUrl.searchParams.get('direction'));
  const debts = await prisma.debt.findMany({
    where: {
      ...(status && { status }),
    },
    orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    include: {
      customer: { select: { name: true, phone: true } },
      order: { select: { id: true, createdAt: true, paymentMethod: true } },
    },
  });
  const filteredDebts = debts
    .filter((debt) => debtMatchesSearch(debt, query))
    .sort((left, right) => {
      const result = compareDebts(left, right, sort, direction);

      if (result !== 0) return result;

      return left.customer.name.localeCompare(right.customer.name, 'pt-BR', { sensitivity: 'base' });
    });

  const header = [
    'id',
    'pedido_id',
    'cliente',
    'telefone',
    'valor para pagamento',
    'vencimento',
    'dias atraso',
    'status',
    'compra',
    'pagamento',
    'renegociado em',
    'valor renegociado',
    'observacoes',
  ];

  const rows = filteredDebts.map((debt) => [
    debt.id,
    debt.orderId,
    debt.customer.name,
    debt.customer.phone,
    (debt.renegotiatedValue ?? debt.value).toFixed(2).replace('.', ','),
    formatDate(debt.dueDate),
    daysLate(debt.dueDate, debt.paidAt),
    debt.status,
    formatDate(debt.order?.createdAt ?? debt.createdAt),
    formatDate(debt.paidAt),
    formatDate(debt.renegotiatedAt),
    debt.renegotiatedValue?.toFixed(2).replace('.', ',') ?? '',
    debt.notes,
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
      'Content-Disposition': `attachment; filename="cobrancas-gasparzinho-${fileDate}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
