import Link from 'next/link';
import { Eye, PlusCircle } from 'lucide-react';
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

export default async function OrdersPage({
  searchParams,
}: {
  searchParams?: { query?: string; page?: string };
}) {
  const query = searchParams?.query ?? '';
  const currentPage = Number(searchParams?.page) || 1;
  const { orders, totalPages } = await getPaginatedOrders(query, currentPage);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Vendas</h2>
          <p className="text-sm text-muted-foreground">
            Consulte pedidos, pagamentos e detalhes das vendas registradas.
          </p>
        </div>
        <Button asChild size="sm" className="gap-2">
          <Link href="/dashboard/vendas/novo">
            <PlusCircle className="h-4 w-4" />
            Nova venda
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="gap-4">
          <div>
            <CardTitle>Pedidos</CardTitle>
            <CardDescription>
              Busque por cliente ou identificador do pedido.
            </CardDescription>
          </div>
          <Search placeholder="Buscar por cliente ou pedido..." />
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="hidden md:table-cell">Data</TableHead>
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
                        <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
                      </TableCell>
                      <TableCell>{order.paymentMethod}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(order.grossValue)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <Button asChild variant="outline" size="icon" className="h-8 w-8">
                            <Link href={`/dashboard/vendas/${order.id}`}>
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