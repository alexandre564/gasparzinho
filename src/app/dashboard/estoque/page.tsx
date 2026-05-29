import Link from 'next/link';
import { ArrowDown, ArrowUp, ArrowUpDown, Download, Pencil, PlusCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Pagination from '@/components/Pagination';
import { Search } from '@/components/Search';
import { CategoryFilter } from './CategoryFilter';
import DeleteProductButton from './DeleteProductButton';
import ImportProductsButton from './ImportProductsButton';
import { StockLevelFilter } from './StockLevelFilter';
import { getPaginatedProducts } from './actions';
import type { ProductSortKey, SortDirection } from './actions';


export const dynamic = 'force-dynamic';
const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

function StockBadge({ inventory }: { inventory: number }) {
  if (inventory <= 5) {
    return <Badge variant="destructive">{inventory} unidades</Badge>;
  }

  if (inventory <= 10) {
    return <Badge className="bg-amber-500 text-white">{inventory} unidades</Badge>;
  }

  return <Badge variant="secondary">{inventory} unidades</Badge>;
}

const sortLabels: Record<ProductSortKey, string> = {
  name: 'Produto',
  category: 'Categoria',
  inventory: 'Saldo',
  price: 'Venda',
  cost: 'Custo',
};

function normalizeSort(sort?: string): ProductSortKey {
  if (sort === 'category' || sort === 'inventory' || sort === 'price' || sort === 'cost') {
    return sort;
  }

  return 'name';
}

function normalizeDirection(direction?: string): SortDirection {
  return direction === 'desc' ? 'desc' : 'asc';
}

function getDefaultDirection(sort: ProductSortKey): SortDirection {
  return sort === 'name' || sort === 'category' ? 'asc' : 'desc';
}

function SortableHeader({
  field,
  activeSort,
  activeDirection,
  searchParams,
  className = '',
}: {
  field: ProductSortKey;
  activeSort: ProductSortKey;
  activeDirection: SortDirection;
  searchParams: { query?: string; category?: string; stock?: string };
  className?: string;
}) {
  const isActive = activeSort === field;
  const nextDirection = isActive
    ? activeDirection === 'asc'
      ? 'desc'
      : 'asc'
    : getDefaultDirection(field);
  const params = new URLSearchParams();

  if (searchParams.query) params.set('query', searchParams.query);
  if (searchParams.category) params.set('category', searchParams.category);
  if (searchParams.stock) params.set('stock', searchParams.stock);

  params.set('page', '1');
  params.set('sort', field);
  params.set('direction', nextDirection);

  const Icon = isActive ? (activeDirection === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <TableHead className={className}>
      <Link
        href={`/dashboard/estoque?${params.toString()}`}
        className="inline-flex items-center gap-1.5 rounded px-1 py-1 font-extrabold text-white transition-colors hover:bg-white/10 hover:text-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        aria-label={`Ordenar por ${sortLabels[field]}`}
        title={`Ordenar por ${sortLabels[field]}`}
      >
        {sortLabels[field]}
        <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-emerald-200' : 'text-slate-300'}`} />
      </Link>
    </TableHead>
  );
}

export default async function StockPage({
  searchParams,
}: {
  searchParams?: {
    query?: string;
    page?: string;
    category?: string;
    stock?: string;
    sort?: string;
    direction?: string;
  };
}) {
  const query = searchParams?.query ?? '';
  const currentPage = Number(searchParams?.page) || 1;
  const category = searchParams?.category;
  const stock = searchParams?.stock;
  const sort = normalizeSort(searchParams?.sort);
  const direction = normalizeDirection(searchParams?.direction);
  const { products, totalPages } = await getPaginatedProducts(
    query,
    currentPage,
    category,
    stock,
    sort,
    direction,
  );
  const exportParams = new URLSearchParams();

  if (query) exportParams.set('query', query);
  if (category) exportParams.set('category', category);
  if (stock) exportParams.set('stock', stock);
  exportParams.set('sort', sort);
  exportParams.set('direction', direction);

  const exportHref = `/api/estoque/exportar${exportParams.toString() ? `?${exportParams.toString()}` : ''}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Estoque</h2>
          <p className="text-sm text-muted-foreground">
            Controle saldos, custos e preços dos produtos vendidos.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" variant="outline" className="gap-2">
            <a href={exportHref} download>
              <Download className="h-4 w-4" />
              Exportar CSV
            </a>
          </Button>
          <Button asChild size="sm" variant="outline" className="gap-2">
            <a href="/api/estoque/modelo" download>
              <Download className="h-4 w-4" />
              Modelo CSV
            </a>
          </Button>
          <ImportProductsButton />
          <Button asChild size="sm" className="gap-2">
            <Link href="/dashboard/estoque/novo">
              <PlusCircle className="h-4 w-4" />
              Novo produto
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="gap-4">
          <div>
            <CardTitle>Produtos</CardTitle>
            <CardDescription>
              Busque por nome ou filtre por categoria para conferir o estoque.
            </CardDescription>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <Search placeholder="Buscar por nome..." />
            <CategoryFilter />
            <StockLevelFilter />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <SortableHeader
                    field="name"
                    activeSort={sort}
                    activeDirection={direction}
                    searchParams={searchParams ?? {}}
                  />
                  <SortableHeader
                    field="category"
                    activeSort={sort}
                    activeDirection={direction}
                    searchParams={searchParams ?? {}}
                  />
                  <SortableHeader
                    field="inventory"
                    activeSort={sort}
                    activeDirection={direction}
                    searchParams={searchParams ?? {}}
                    className="text-center"
                  />
                  <SortableHeader
                    field="price"
                    activeSort={sort}
                    activeDirection={direction}
                    searchParams={searchParams ?? {}}
                    className="text-right"
                  />
                  <SortableHeader
                    field="cost"
                    activeSort={sort}
                    activeDirection={direction}
                    searchParams={searchParams ?? {}}
                    className="hidden md:table-cell text-right"
                  />
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.length > 0 ? (
                  products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="font-medium">{product.name}</div>
                        {product.description && (
                          <div className="text-sm text-muted-foreground">{product.description}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{product.category}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <StockBadge inventory={product.inventory} />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(Number(product.price))}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-right text-muted-foreground">
                        {formatCurrency(Number(product.cost))}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button asChild variant="outline" size="icon" className="h-8 w-8">
                            <Link
                              href={`/dashboard/estoque/${product.id}/editar`}
                              aria-label={`Editar ${product.name}`}
                              title={`Editar ${product.name}`}
                            >
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Editar</span>
                            </Link>
                          </Button>
                          <DeleteProductButton id={product.id} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <div className="mx-auto max-w-sm space-y-2">
                        <p className="font-medium">Nenhum produto encontrado</p>
                        <p className="text-sm text-muted-foreground">
                          Cadastre produtos para liberar vendas e controle de entregas.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <Pagination totalPages={totalPages} />
        </CardContent>
      </Card>
    </div>
  );
}
