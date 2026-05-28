import { NextRequest, NextResponse } from 'next/server';
import { requireApiAccess } from '@/lib/api-auth';
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

function escapeVCard(value: string | null | undefined) {
  return (value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .trim();
}

function customerMatchesSearch(
  customer: {
    name: string;
    phone: string;
    cep: string | null;
    street: string | null;
    number: string | null;
    complement: string | null;
    neighborhood: string | null;
    city: string | null;
    reference: string | null;
  },
  query: string,
) {
  const term = normalizeText(query);
  const digits = onlyDigits(query);

  if (!term && !digits) return true;

  const textMatch = [
    customer.name,
    customer.phone,
    customer.cep,
    customer.street,
    customer.number,
    customer.complement,
    customer.neighborhood,
    customer.city,
    customer.reference,
  ]
    .map(normalizeText)
    .some((value) => value.includes(term));
  const phoneMatch = Boolean(digits) && onlyDigits(customer.phone).includes(digits);

  return textMatch || phoneMatch;
}

export async function GET(request: NextRequest) {
  const denied = await requireApiAccess(['ADMIN', 'VENDEDOR']);

  if (denied) {
    return denied;
  }

  const query = request.nextUrl.searchParams.get('query')?.trim() ?? '';
  const customers = await prisma.customer.findMany({
    orderBy: { name: 'asc' },
    select: {
      name: true,
      phone: true,
      cep: true,
      street: true,
      number: true,
      complement: true,
      neighborhood: true,
      city: true,
      reference: true,
    },
  });
  const filteredCustomers = customers.filter((customer) => customerMatchesSearch(customer, query));
  const cards = filteredCustomers.map((customer) => {
    const streetAddress = [customer.street, customer.number, customer.complement]
      .filter(Boolean)
      .join(' ');
    const notes = [customer.reference, customer.neighborhood].filter(Boolean).join(' - ');

    return [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${escapeVCard(customer.name)}`,
      `N:${escapeVCard(customer.name)};;;;`,
      `TEL;TYPE=CELL:${escapeVCard(customer.phone)}`,
      streetAddress || customer.city
        ? `ADR;TYPE=HOME:;;${escapeVCard(streetAddress)};${escapeVCard(customer.city)};;;${escapeVCard(customer.cep)}`
        : '',
      notes ? `NOTE:${escapeVCard(notes)}` : '',
      'END:VCARD',
    ]
      .filter(Boolean)
      .join('\r\n');
  });
  const fileDate = new Date().toISOString().slice(0, 10);

  return new NextResponse(`\uFEFF${cards.join('\r\n')}\r\n`, {
    status: 200,
    headers: {
      'Content-Type': 'text/vcard; charset=utf-8',
      'Content-Disposition': `attachment; filename="contatos-gasparzinho-${fileDate}.vcf"`,
      'Cache-Control': 'no-store',
    },
  });
}
