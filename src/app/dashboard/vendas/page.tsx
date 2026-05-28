import Link from 'next/link';
import { ArrowDown, ArrowUp, ArrowUpDown, Download, Eye, PlusCircle } from 'lucide-react';
import { Badge, type BadgeProps } from '@/components/ui/badge';
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
import { getPaginatedOrders } from './actions';
import type { OrderSortKey, SortDirection } from './actions';
import { DateFilter } from './DateFilter';
import { PaymentMethodFilter } from './PaymentMethodFilter';
import { StatusFilter } from './StatusFilter';
import { labelFrom, orderStatusLabels, paymentMethodLabels } from '@/lib/labels';


export const dynamic = 'force-dynamic';
const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

function getStatusVariant(status: string): BadgeProps['variant'] {
  switch (status) {
    case 'ENTREGUE':
    case 'CONCLUIDO':
    case 'CONFIRMADO':
      return 'success';
    case 'CANCELADO':
      return 'destructive';
    case 'PENDENTE':
      return 'secondary';
    default:
      return 'outline';
  }
}

const sortLabels: Record<OrderSortKey, string> = {
  createdAt: 'Data',
  customer: 'Cliente',
  status: 'Status',
  paymentMethod: 'Pagamento',
  grossValue: 'Valor',
};

function normalizeSort(sort?: string): OrderSortKey {
  if (
    sort === 'customer' ||
    sort === 'status' ||
    sort === 'paymentMethod' ||
    sort === 'grossValue'
  ) {
    return sort;
  }

  return 'createdAt';
}

function normalizeDirection(direction?: string): SortDirection {
  return direction === 'asc' ? 'asc' : 'desc';
}

function getDefaultDirection(sort: OrderSortKey): SortDirection {
  return sort === 'customer' || sort === 'status' || sort === 'paymentMethod' ? 'asc' : 'desc';
}

function SortableHeader({
  field,
  activeSort,
  activeDirection,
  searchParams,
  className = '',
}: {
  field: OrderSortKey;
  activeSort: OrderSortKey;
  activeDirection: SortDirection;
  searchParams: {
    query?: string;
    status?: string;
    date?: string;
    paymentMethod?: string;
  };
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
  if (searchParams.status) params.set('status', searchParams.status);
  if (searchParams.date) params.set('date', searchParams.date);
  if (searchParams.paymentMethod) params.set('paymentMethod', searchParams.paymentMethod);

  params.set('page', '1');
  params.set('sort', field);
  params.set('direction', nextDirection);

  const Icon = isActive ? (activeDirection === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <TableHead className={className}>
      <Link
        href={`/dashboard/vendas?${params.toString()}`}
        className="inline-flex items-center gap-1.5 rounded px-1 py-1 font-extrabold text-slate-950 transition-colors hover:bg-emerald-50 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        aria-label={`Ordenar por ${sortLabels[field]}`}
        title={`Ordenar por ${sortLabels[field]}`}
      >
        {sortLabels[field]}
        <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-emerald-700' : 'text-slate-500'}`} />
      </Link>
    </TableHead>
  );
}


export default async function OrdersPage({
  searchParams,
}: {
  searchParams?: {
    query?: string;
    page?: string;
    status?: string;
    date?: string;
    paymentMethod?: string;
    sort?: string;
    direction?: string;
  };
}) {
  const query = searchParams?.query ?? '';
  const currentPage = Number(searchParams?.page) || 1;
  const status = searchParams?.status;
  const date = searchParams?.date;
  const paymentMethod = searchParams?.paymentMethod;
  const sort = normalizeSort(searchParams?.sort);
  const direction = normalizeDirection(searchParams?.direction);
  const { orders, totalPages } = await getPaginatedOrders(
    query,
    currentPage,
    status,
    date,
    paymentMethod,
    sort,
    direction,
  );
  const exportParams = new URLSearchParams();

  if (query) exportParams.set('query', query);
  if (status) exportParams.set('status', status);
  if (date) exportParams.set('date', date);
  if (paymentMethod) exportParams.set('paymentMethod', paymentMethod);
  exportParams.set('sort', sort);
  exportParams.set('direction', direction);

  const exportHref = `/api/vendas/exportar${exportParams.toString() ? `?${exportParams.toString()}` : ''}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Vendas</h2>
          <p className="text-sm text-muted-foreground">
            Consulte pedidos, pagamentos e detalhes das vendas registradas.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild variant="outline" size="sm" className="gap-2">
            <a href={exportHref} download>
              <Download className="h-4 w-4" />
              Exportar CSV
            </a>
          </Button>
          <Button asChild size="sm" className="gap-2">
            <Link href="/dashboard/vendas/novo">
              <PlusCircle className="h-4 w-4" />
              Nova venda
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="gap-4">
          <div>
            <CardTitle>Pedidos</CardTitle>
            <CardDescription>
              Busque por cliente ou identificador do pedido.
            </CardDescription>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <Search placeholder="Buscar por cliente, telefone, pagamento ou pedido..." />
            <StatusFilter />
            <PaymentMethodFilter />
            <DateFilter />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <SortableHeader
                    field="customer"
                    activeSort={sort}
                    activeDirection={direction}
                    searchParams={searchParams ?? {}}
                  />
                  <SortableHeader
                    field="status"
                    activeSort={sort}
                    activeDirection={direction}
                    searchParams={searchParams ?? {}}
                  />
                  <SortableHeader
                    field="paymentMethod"
                    activeSort={sort}
                    activeDirection={direction}
                    searchParams={searchParams ?? {}}
                  />
                  <SortableHeader
                    field="grossValue"
                    activeSort={sort}
                    activeDirection={direction}
                    searchParams={searchParams ?? {}}
                    className="text-right"
                  />
                  <SortableHeader
                    field="createdAt"
                    activeSort={sort}
                    activeDirection={direction}
                    searchParams={searchParams ?? {}}
                    className="hidden md:table-cell"
                  />
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length > 0 ? (
                  orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs font-medium text-muted-foreground">
                        {order.id.slice(-8).toUpperCase()}
                      </TableCell>
                      <TableCell className="font-medium">{order.customer.name}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(order.status)}>{labelFrom(orderStatusLabels, order.status)}</Badge>
                      </TableCell>
                      <TableCell>{labelFrom(paymentMethodLabels, order.paymentMethod)}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(order.grossValue)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <Button asChild variant="outline" size="icon" className="h-8 w-8">
                            <Link
                              href={`/dashboard/vendas/${order.id}`}
                              aria-label={`Ver detalhes do pedido ${order.id.slice(-8).toUpperCase()}`}
                              title="Ver detalhes"
                            >
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">Ver detalhes</span>
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center">
                      <div className="mx-auto max-w-sm space-y-2">
                        <p className="font-medium">Nenhum pedido encontrado</p>
                        <p className="text-sm text-muted-foreground">
                          Crie uma nova venda para iniciar o fluxo de entrega e cobrança.
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
