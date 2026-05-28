import { NextResponse } from 'next/server';
import { auth } from '@/auth';
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

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const debts = await prisma.debt.findMany({
    orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    include: {
      customer: { select: { name: true, phone: true } },
      order: { select: { id: true, createdAt: true, paymentMethod: true } },
    },
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

  const rows = debts.map((debt) => [
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
