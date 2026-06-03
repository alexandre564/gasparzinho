import { NextRequest, NextResponse } from 'next/server';
import { requireApiAccess } from '@/lib/api-auth';
import { buildBranchWhere } from '@/lib/branch-scope';
import { decodeContactText, normalizeSearchText, onlyDigits } from '@/lib/contact-text';
import { getCurrentBranchScope } from '@/lib/current-branch-scope';
import { calculateDebtDaysLate, getDebtEffectiveStatus, getDebtPaymentBreakdown } from '@/lib/debts';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function formatDate(value?: Date | null) {
  return value ? value.toLocaleDateString('pt-BR') : '';
}

type ExportDebt = Awaited<ReturnType<typeof prisma.debt.findMany>>[number] & {
  customer: { name: string; phone: string };
  order: { id: string; createdAt: Date; paymentMethod: string } | null;
};

type EnhancedExportDebt = ExportDebt & {
  daysLate: number;
  effectiveStatus: string;
  paymentValue: number;
};

const debtSortKeys = ['customer', 'phone', 'value', 'dueDate', 'daysLate', 'status', 'paidAt'] as const;
const debtStatusFilterValues = ['PENDENTE', 'VENCIDO', 'RENEGOCIADO', 'PAGO', 'CANCELADA'] as const;
type DebtSortKey = (typeof debtSortKeys)[number];
type SortDirection = 'asc' | 'desc';

function enhanceDebt(debt: ExportDebt): EnhancedExportDebt {
  return {
    ...debt,
    paymentValue: debt.renegotiatedValue ?? debt.value,
    daysLate: calculateDebtDaysLate(debt.dueDate, debt.status, debt.paidAt),
    effectiveStatus: getDebtEffectiveStatus(debt),
  };
}

function debtMatchesSearch(debt: EnhancedExportDebt, query: string) {
  const term = normalizeSearchText(query);
  const digits = onlyDigits(query);

  if (!term && !digits) return true;

  const customerName = decodeContactText(debt.customer.name);
  const customerPhone = decodeContactText(debt.customer.phone);
  const textMatch = [customerName, customerPhone, debt.effectiveStatus, debt.status, debt.notes, debt.id]
    .map(normalizeSearchText)
    .some((value) => value.includes(term));
  const phoneMatch = Boolean(digits) && onlyDigits(customerPhone).includes(digits);

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

function compareDebts(left: EnhancedExportDebt, right: EnhancedExportDebt, sort: DebtSortKey, direction: SortDirection) {
  if (sort === 'customer') {
    const result = left.customer.name.localeCompare(right.customer.name, 'pt-BR', { sensitivity: 'base' });
    return direction === 'asc' ? result : -result;
  }

  if (sort === 'phone') {
    const result = left.customer.phone.localeCompare(right.customer.phone, 'pt-BR', { sensitivity: 'base' });
    return direction === 'asc' ? result : -result;
  }

  if (sort === 'status') {
    const result = left.effectiveStatus.localeCompare(right.effectiveStatus, 'pt-BR', { sensitivity: 'base' });
    return direction === 'asc' ? result : -result;
  }

  if (sort === 'value') {
    return compareNullableNumber(left.paymentValue, right.paymentValue, direction);
  }

  if (sort === 'daysLate') {
    return compareNullableNumber(left.daysLate, right.daysLate, direction);
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
  const branchScope = await getCurrentBranchScope();
  const debts = await prisma.debt.findMany({
    where: buildBranchWhere(branchScope),
    orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    include: {
      customer: { select: { name: true, phone: true } },
      order: { select: { id: true, createdAt: true, paymentMethod: true } },
    },
  });
  const filteredDebts = debts
    .map(enhanceDebt)
    .filter((debt) => debtMatchesSearch(debt, query))
    .filter((debt) => !status || debt.effectiveStatus === status)
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
    'valor pago renegociacao',
    'restante registrado',
    'observacoes',
  ];

  const rows = filteredDebts.map((debt) => {
    const paymentBreakdown = getDebtPaymentBreakdown(debt.notes);

    return [
      debt.id,
      debt.orderId,
      decodeContactText(debt.customer.name),
      decodeContactText(debt.customer.phone),
      debt.paymentValue.toFixed(2).replace('.', ','),
      formatDate(debt.dueDate),
      debt.daysLate,
      debt.effectiveStatus,
      formatDate(debt.order?.createdAt ?? debt.createdAt),
      formatDate(debt.paidAt),
      formatDate(debt.renegotiatedAt),
      debt.renegotiatedValue?.toFixed(2).replace('.', ',') ?? '',
      paymentBreakdown.paidAmount?.toFixed(2).replace('.', ',') ?? '',
      paymentBreakdown.remainingValue?.toFixed(2).replace('.', ',') ?? '',
      debt.notes,
    ];
  });

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
