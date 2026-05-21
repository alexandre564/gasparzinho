import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

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

function matchesCustomer(customer: {
  name: string;
  phone: string;
  city: string;
  neighborhood: string;
  street: string;
  reference: string | null;
}, query: string) {
  const term = normalizeText(query);
  const digits = onlyDigits(query);
  const textFields = [
    customer.name,
    customer.phone,
    customer.city,
    customer.neighborhood,
    customer.street,
    customer.reference,
  ].map(normalizeText);
  const phoneDigits = onlyDigits(customer.phone);

  return textFields.some((field) => field.includes(term)) || Boolean(digits && phoneDigits.includes(digits));
}

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Nao autorizado.' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim() ?? '';

  if (!query) {
    return NextResponse.json({ customers: [] });
  }

  const customers = await prisma.customer.findMany({
    orderBy: { name: 'asc' },
    take: 80,
    select: {
      id: true,
      name: true,
      phone: true,
      city: true,
      neighborhood: true,
      street: true,
      reference: true,
      debts: {
        where: { status: { in: ['PENDENTE', 'VENCIDO'] } },
        select: { value: true },
      },
    },
  });

  const filtered = customers
    .filter((customer) => matchesCustomer(customer, query))
    .slice(0, 6)
    .map((customer) => ({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      address: [customer.street, customer.neighborhood, customer.city].filter(Boolean).join(' - '),
      totalDebt: customer.debts.reduce((sum, debt) => sum + debt.value, 0),
    }));

  return NextResponse.json({ customers: filtered });
}