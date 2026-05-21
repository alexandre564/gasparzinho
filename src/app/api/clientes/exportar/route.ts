import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: 'Nao autorizado.' }, { status: 401 });
  }

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
      createdAt: true,
    },
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
  ];

  const rows = customers.map((customer) => [
    customer.name,
    customer.name,
    'Mobile',
    customer.phone,
    [customer.street, customer.number, customer.complement, customer.neighborhood].filter(Boolean).join(', '),
    customer.city,
    customer.reference,
    customer.name,
    customer.phone,
    customer.cep,
    customer.street,
    customer.number,
    customer.complement,
    customer.neighborhood,
    customer.city,
    customer.reference,
    customer.createdAt.toLocaleDateString('pt-BR'),
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
      'Content-Disposition': `attachment; filename="clientes-gasparzinho-${fileDate}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
