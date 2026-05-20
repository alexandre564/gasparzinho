import Link from 'next/link';
import { Suspense } from 'react';
import { Search, PlusCircle, Eye } from 'lucide-react';
import { getPaginatedOrders } from './actions';
import { OrderStatus } from '@/types/enums';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

const getStatusVariant = (status: OrderStatus) => {
  switch (status) {
    case 'CONFIRMADO':
      return 'success';
    case 'PENDENTE':
      return 'secondary';
    case 'CANCELADO':
      return 'destructive';
    default:
      return 'outline';
  }
};

export default async function OrdersPage({
  searchParams,
}: {
  searchParams?: {
    query?: string;
    page?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  };
}) {
  const query = searchParams?.query ?? '';
  const currentPage = Number(searchParams?.page) || 1;

  const { orders, totalPages } = await getPaginatedOrders(
    query,
    currentPage
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Vendas</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie os pedidos cadastrados no sistema.
          </p>
        </div>

        <Link href="/dashboard/vendas/novo">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nova venda
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pedidos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="flex items-center gap-2">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="query"
                defaultValue={query}
                placeholder="Buscar por cliente ou ID do pedido"
                className="pl-9"
              />
            </div>
            <Button type="submit" variant="outline">
              Buscar
            </Button>
          </form>

          <Suspense fallback={<div>Carregando pedidos...</div>}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead className="text-right">Valor bruto</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length > 0 ? (
                  orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.id}</TableCell>
                      <TableCell>{order.customer.name}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(order.status as OrderStatus)}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{order.paymentMethod}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(order.grossValue)}
                      </TableCell>
                      <TableCell>
                        {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/dashboard/vendas/${order.id}`}>
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">Ver detalhes</span>
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Nenhum pedido encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Suspense>

          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">
              Total de páginas: {totalPages}
            </p>

            <div className="flex items-center gap-2">
              <Link
                href={`/dashboard/vendas?query=${encodeURIComponent(query)}&page=${Math.max(currentPage - 1, 1)}`}
              >
                <Button variant="outline" disabled={currentPage <= 1}>
                  Anterior
                </Button>
              </Link>

              <span className="text-sm text-muted-foreground">
                Página {currentPage}
              </span>

              <Link
                href={`/dashboard/vendas?query=${encodeURIComponent(query)}&page=${currentPage + 1}`}
              >
                <Button
                  variant="outline"
                  disabled={currentPage >= totalPages}
                >
                  Próxima
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
