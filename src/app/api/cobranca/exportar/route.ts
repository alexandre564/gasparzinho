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

export async function GET(request: NextRequest) {
  const denied = await requireApiAccess(["ADMIN"]);

  if (denied) {
    return denied;
  }

  const query = request.nextUrl.searchParams.get('query')?.trim() ?? '';
  const status = request.nextUrl.searchParams.get('status')?.trim() ?? '';
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
  const filteredDebts = debts.filter((debt) => debtMatchesSearch(debt, query));

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
