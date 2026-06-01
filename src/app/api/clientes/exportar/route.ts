import { NextRequest, NextResponse } from 'next/server';
import { requireApiAccess } from '@/lib/api-auth';
import { cleanCustomerTextFields, normalizeSearchText, onlyDigits } from '@/lib/contact-text';
import { buildBranchWhere } from '@/lib/branch-scope';
import { getCurrentBranchScope } from '@/lib/current-branch-scope';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

type ExportCustomer = Awaited<ReturnType<typeof prisma.customer.findMany>>[number] & {
  orders: { createdAt: Date }[];
  debts: { value: number; renegotiatedValue: number | null }[];
};

function customerMatchesSearch(customer: ExportCustomer, query: string) {
  const cleanedCustomer = cleanCustomerTextFields(customer);
  const term = normalizeSearchText(query);
  const digits = onlyDigits(query);

  if (!term && !digits) return true;

  const textMatch = [
    cleanedCustomer.name,
    cleanedCustomer.phone,
    cleanedCustomer.cep,
    cleanedCustomer.street,
    cleanedCustomer.number,
    cleanedCustomer.complement,
    cleanedCustomer.neighborhood,
    cleanedCustomer.city,
    cleanedCustomer.reference,
  ]
    .map(normalizeSearchText)
    .some((value) => value.includes(term));
  const phoneMatch = Boolean(digits) && onlyDigits(cleanedCustomer.phone).includes(digits);

  return textMatch || phoneMatch;
}

function getCustomerMetrics(customer: ExportCustomer) {
  const lastPurchase = customer.orders[0]?.createdAt ?? null;
  const daysSinceLastPurchase = lastPurchase
    ? Math.floor((Date.now() - lastPurchase.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const totalDebt = customer.debts.reduce(
    (sum, debt) => sum + (debt.renegotiatedValue ?? debt.value),
    0,
  );

  return { lastPurchase, daysSinceLastPurchase, totalDebt };
}

export async function GET(request: NextRequest) {
  const denied = await requireApiAccess(["ADMIN","VENDEDOR"]);

  if (denied) {
    return denied;
  }

  const query = request.nextUrl.searchParams.get('query')?.trim() ?? '';
  const sort = request.nextUrl.searchParams.get('sort') ?? 'lastPurchase';
  const direction = request.nextUrl.searchParams.get('direction') === 'asc' ? 'asc' : 'desc';
  const branchScope = await getCurrentBranchScope();
  const customers = await prisma.customer.findMany({
    where: buildBranchWhere(branchScope),
    orderBy: { name: 'asc' },
    include: {
      orders: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { createdAt: true },
      },
      debts: {
        where: { status: { in: ['PENDENTE', 'VENCIDO', 'RENEGOCIADO'] } },
        select: { value: true, renegotiatedValue: true },
      },
    },
  });
  const filteredCustomers = customers
    .filter((customer) => customerMatchesSearch(customer, query))
    .sort((left, right) => {
      const leftMetrics = getCustomerMetrics(left);
      const rightMetrics = getCustomerMetrics(right);
      let result = 0;

      if (sort === 'name') result = left.name.localeCompare(right.name, 'pt-BR', { sensitivity: 'base' });
      else if (sort === 'city') result = left.city.localeCompare(right.city, 'pt-BR', { sensitivity: 'base' });
      else if (sort === 'daysSinceLastPurchase') {
        result = (leftMetrics.daysSinceLastPurchase ?? Number.MAX_SAFE_INTEGER) -
          (rightMetrics.daysSinceLastPurchase ?? Number.MAX_SAFE_INTEGER);
      } else {
        result = (leftMetrics.lastPurchase?.getTime() ?? 0) - (rightMetrics.lastPurchase?.getTime() ?? 0);
      }

      return direction === 'asc' ? result : -result;
    });

  const header = [
    'Name',
    'Given Name',
    'Phone 1 - Type',
    'Phone 1 - Value',
    'Address 1 - Street',
    'Address 1 - City',
    'Notes',
    'nome',
    'telefone',
    'cep',
    'rua',
    'numero',
    'complemento',
    'bairro',
    'cidade',
    'referencia',
    'criado_em',
    'ultima_compra',
    'dias_sem_comprar',
    'divida_aberta',
  ];

  const rows = filteredCustomers.map((customer) => {
    const cleanedCustomer = cleanCustomerTextFields(customer);
    const metrics = getCustomerMetrics(customer);

    return [
      cleanedCustomer.name,
      cleanedCustomer.name,
      'Mobile',
      cleanedCustomer.phone,
      [cleanedCustomer.street, cleanedCustomer.number, cleanedCustomer.complement, cleanedCustomer.neighborhood].filter(Boolean).join(', '),
      cleanedCustomer.city,
      cleanedCustomer.reference,
      cleanedCustomer.name,
      cleanedCustomer.phone,
      cleanedCustomer.cep,
      cleanedCustomer.street,
      cleanedCustomer.number,
      cleanedCustomer.complement,
      cleanedCustomer.neighborhood,
      cleanedCustomer.city,
      cleanedCustomer.reference,
      customer.createdAt.toLocaleDateString('pt-BR'),
      metrics.lastPurchase?.toLocaleDateString('pt-BR') ?? '',
      metrics.daysSinceLastPurchase ?? '',
      metrics.totalDebt.toFixed(2).replace('.', ','),
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
      'Content-Disposition': `attachment; filename="clientes-gasparzinho-${fileDate}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
