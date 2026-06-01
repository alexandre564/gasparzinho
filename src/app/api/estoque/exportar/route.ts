import { NextRequest, NextResponse } from 'next/server';
import { requireApiAccess } from '@/lib/api-auth';
import { buildBranchWhere } from '@/lib/branch-scope';
import { getCurrentBranchScope } from '@/lib/current-branch-scope';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function getStockFilter(stock?: string): Prisma.IntFilter | undefined {
  switch (stock) {
    case 'SEM_ESTOQUE':
      return { lte: 0 };
    case 'CRITICO':
      return { lte: 5 };
    case 'BAIXO':
      return { gt: 5, lte: 10 };
    case 'DISPONIVEL':
      return { gt: 10 };
    default:
      return undefined;
  }
}

type ProductSortKey = 'name' | 'category' | 'inventory' | 'price' | 'cost';
type SortDirection = 'asc' | 'desc';

function normalizeSortKey(sort?: string): ProductSortKey {
  if (sort === 'category' || sort === 'inventory' || sort === 'price' || sort === 'cost') {
    return sort;
  }

  return 'name';
}

function normalizeSortDirection(direction?: string): SortDirection {
  return direction === 'desc' ? 'desc' : 'asc';
}

function buildProductOrderBy(sort: ProductSortKey, direction: SortDirection): Prisma.ProductOrderByWithRelationInput {
  if (sort === 'category') {
    return { category: direction };
  }

  if (sort === 'inventory') {
    return { inventory: direction };
  }

  if (sort === 'price') {
    return { price: direction };
  }

  if (sort === 'cost') {
    return { cost: direction };
  }

  return { name: direction };
}

export async function GET(request: NextRequest) {
  const denied = await requireApiAccess(["ADMIN","VENDEDOR"]);

  if (denied) {
    return denied;
  }

  const query = request.nextUrl.searchParams.get('query')?.trim() ?? '';
  const category = request.nextUrl.searchParams.get('category')?.trim() ?? '';
  const stock = request.nextUrl.searchParams.get('stock')?.trim() ?? '';
  const stockFilter = getStockFilter(stock);
  const sort = normalizeSortKey(request.nextUrl.searchParams.get('sort')?.trim() ?? '');
  const direction = normalizeSortDirection(request.nextUrl.searchParams.get('direction')?.trim() ?? '');
  const branchScope = await getCurrentBranchScope();
  const products = await prisma.product.findMany({
    where: {
      ...buildBranchWhere(branchScope),
      ...(query && {
        OR: [
          { name: { contains: query } },
          { description: { contains: query } },
        ],
      }),
      ...(category && { category }),
      ...(stockFilter && { inventory: stockFilter }),
    },
    orderBy: buildProductOrderBy(sort, direction),
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
