import { NextRequest, NextResponse } from 'next/server';
import { requireApiAccess } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  const denied = await requireApiAccess(["ADMIN","VENDEDOR"]);

  if (denied) {
    return denied;
  }

  const query = request.nextUrl.searchParams.get('query')?.trim() ?? '';
  const category = request.nextUrl.searchParams.get('category')?.trim() ?? '';
  const products = await prisma.product.findMany({
    where: {
      ...(query && {
        OR: [
          { name: { contains: query } },
          { description: { contains: query } },
        ],
      }),
      ...(category && { category }),
    },
    orderBy: { name: 'asc' },
  });

  const header = [
    'nome',
    'descricao',
    'preco venda',
    'custo',
    'categoria',
    'tipo estoque',
    'saldo',
    'criado em',
  ];

  const rows = products.map((product) => [
    product.name,
    product.description,
    product.price.toFixed(2).replace('.', ','),
    product.cost.toFixed(2).replace('.', ','),
    product.category,
    product.stockKind,
    product.inventory,
    product.createdAt.toLocaleDateString('pt-BR'),
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
      'Content-Disposition': `attachment; filename="produtos-gasparzinho-${fileDate}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
