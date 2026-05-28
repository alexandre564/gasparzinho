import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowUp, ArrowUpDown, Download, MessageCircle, Pencil, PlusCircle, ShoppingCart } from 'lucide-react';
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
import DeleteCustomerButton from './DeleteCustomerButton';
import ImportCustomersButton from './ImportCustomersButton';
import { getPaginatedCustomers } from './actions';
import type { CustomerSortKey, SortDirection } from './actions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

function getDaysColor(days: number | null) {
  if (days === null) return 'bg-muted text-muted-foreground';
  if (days <= 7) return 'bg-emerald-600 text-white';
  if (days <= 15) return 'bg-amber-500 text-white';
  if (days <= 30) return 'bg-orange-500 text-white';
  return 'bg-red-600 text-white';
}

const sortLabels: Record<CustomerSortKey, string> = {
  name: 'Cliente',
  city: 'Cidade',
  lastPurchase: '\u00daltima compra',
  daysSinceLastPurchase: 'Sem comprar',
};

function normalizeSort(sort?: string): CustomerSortKey {
  if (sort === 'name' || sort === 'city' || sort === 'daysSinceLastPurchase') {
    return sort;
  }

  return 'lastPurchase';
}

function normalizeDirection(direction?: string): SortDirection {
  return direction === 'asc' ? 'asc' : 'desc';
}

function getDefaultDirection(sort: CustomerSortKey): SortDirection {
  return sort === 'name' || sort === 'city' ? 'asc' : 'desc';
}

function SortableHeader({
  field,
  activeSort,
  activeDirection,
  searchParams,
  className = '',
}: {
  field: CustomerSortKey;
  activeSort: CustomerSortKey;
  activeDirection: SortDirection;
  searchParams: { query?: string };
  className?: string;
}) {
  const isActive = activeSort === field;
  const nextDirection = isActive
    ? activeDirection === 'asc'
      ? 'desc'
      : 'asc'
    : getDefaultDirection(field);
  const params = new URLSearchParams();

  if (searchParams.query) {
    params.set('query', searchParams.query);
  }

  params.set('page', '1');
  params.set('sort', field);
  params.set('direction', nextDirection);

  const Icon = isActive ? (activeDirection === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <TableHead className={className}>
      <a
        href={`/dashboard/clientes?${params.toString()}`}
        className="inline-flex items-center gap-1.5 rounded px-1 py-1 font-extrabold text-slate-950 transition-colors hover:bg-emerald-50 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        aria-label={`Ordenar por ${sortLabels[field]}`}
        title={`Ordenar por ${sortLabels[field]}`}
      >
        {sortLabels[field]}
        <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-emerald-700' : 'text-slate-500'}`} />
      </a>
    </TableHead>
  );
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams?: { query?: string; page?: string; sort?: string; direction?: string };
}) {
  const query = searchParams?.query ?? '';
  const currentPage = Number(searchParams?.page) || 1;
  const sort = normalizeSort(searchParams?.sort);
  const direction = normalizeDirection(searchParams?.direction);
  const { customers, totalPages } = await getPaginatedCustomers(query, currentPage, sort, direction);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Clientes</h2>
          <p className="text-sm text-muted-foreground">
            Cadastre, pesquise e acompanhe o histórico de compras dos clientes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm" variant="outline" className="gap-2">
            <a href="/api/clientes/exportar" download>
              <Download className="h-4 w-4" />
              Exportar CSV
            </a>
          </Button>
          <Button asChild size="sm" variant="outline" className="gap-2">
            <a href="/api/clientes/modelo" download>
              <Download className="h-4 w-4" />
              Modelo CSV
            </a>
          </Button>
          <ImportCustomersButton />
          <Button asChild size="sm" className="gap-2">
            <Link href="/dashboard/clientes/novo">
              <PlusCircle className="h-4 w-4" />
              Novo cliente
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="gap-4">
          <div>
            <CardTitle>Lista de clientes</CardTitle>
            <CardDescription>
              Use a busca para localizar clientes por nome ou telefone.
            </CardDescription>
          </div>
          <Suspense fallback={<div className="h-11 w-full max-w-xl rounded-md border bg-white" />}>
            <Search placeholder="Digite nome, celular ou WhatsApp..." />
          </Suspense>
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
                    field="city"
                    activeSort={sort}
                    activeDirection={direction}
                    searchParams={searchParams ?? {}}
                    className="hidden md:table-cell"
                  />
                  <SortableHeader
                    field="lastPurchase"
                    activeSort={sort}
                    activeDirection={direction}
                    searchParams={searchParams ?? {}}
                    className="hidden lg:table-cell"
                  />
                  <SortableHeader
                    field="daysSinceLastPurchase"
                    activeSort={sort}
                    activeDirection={direction}
                    searchParams={searchParams ?? {}}
                    className="hidden lg:table-cell"
                  />
                  <TableHead className="text-right">Dívida</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.length > 0 ? (
                  customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <Link
                          href={`/dashboard/vendas/novo?customerId=${customer.id}`}
                          className="font-bold text-slate-950 hover:text-emerald-700 hover:underline"
                          title="Iniciar pedido para este cliente"
                        >
                          {customer.name}
                        </Link>
                        <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200"><MessageCircle className="h-3 w-3" />{customer.phone}</div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{customer.city}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {customer.lastPurchase
                          ? new Date(customer.lastPurchase).toLocaleDateString('pt-BR')
                          : 'Sem compras'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {customer.daysSinceLastPurchase !== null ? (
                          <Badge className={getDaysColor(customer.daysSinceLastPurchase)}>
                            {customer.daysSinceLastPurchase} dias
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Novo</Badge>
                        )}
                      </TableCell>
                      <TableCell
                        className={`text-right font-semibold ${
                          customer.totalDebt > 0 ? 'text-destructive' : 'text-emerald-700'
                        }`}
                      >
                        {formatCurrency(customer.totalDebt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button asChild size="sm" className="gap-2">
                            <Link
                              href={`/dashboard/vendas/novo?customerId=${customer.id}`}
                              aria-label={`Novo pedido para ${customer.name}`}
                              title="Novo pedido"
                            >
                              <ShoppingCart className="h-4 w-4" />
                              <span className="hidden xl:inline">Pedido</span>
                            </Link>
                          </Button>
                          <Button asChild variant="outline" size="icon" className="h-8 w-8">
                            <Link
                              href={`/dashboard/clientes/${customer.id}/editar`}
                              aria-label={`Editar ${customer.name}`}
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Editar</span>
                            </Link>
                          </Button>
                          <DeleteCustomerButton id={customer.id} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <div className="mx-auto max-w-sm space-y-2">
                        <p className="font-medium">Nenhum cliente encontrado</p>
                        <p className="text-sm text-muted-foreground">
                          Cadastre um novo cliente ou ajuste os termos da busca.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <Suspense fallback={null}>
            <Pagination totalPages={totalPages} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
