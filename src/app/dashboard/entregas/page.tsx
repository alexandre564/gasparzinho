import Link from 'next/link';
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
import type { DeliveryStatus } from '@/types/enums';
import StatusFilter from './StatusFilter';
import StatusUpdater from './StatusUpdater';
import DeliveryWorkflowActions from './DeliveryWorkflowActions';
import { getPaginatedDeliveries } from './actions';
import { getDriverWhatsappNumber } from '../configuracoes/actions';

function ItemsSummary({
  items,
}: {
  items: { product: { name: string }; quantity: number }[];
}) {
  const summary = items.map((item) => `${item.quantity}x ${item.product.name}`).join(', ');

  if (!summary) {
    return <span className="text-muted-foreground">Sem itens</span>;
  }

  return (
    <span title={summary} className="line-clamp-1">
      {summary}
    </span>
  );
}

export default async function DeliveriesPage({
  searchParams,
}: {
  searchParams?: { query?: string; page?: string; status?: DeliveryStatus };
}) {
  const query = searchParams?.query ?? '';
  const currentPage = Number(searchParams?.page) || 1;
  const status = searchParams?.status;
  const [deliveryData, driverWhatsapp] = await Promise.all([
    getPaginatedDeliveries(query, currentPage, status),
    getDriverWhatsappNumber(),
  ]);
  const deliveries = deliveryData.deliveries ?? [];
  const totalPages = deliveryData.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Entregas</h2>
        <p className="text-sm text-muted-foreground">
          Acompanhe enderecos, itens e andamento das entregas.
        </p>
      </div>

      <Card>
        <CardHeader className="gap-4">
          <div>
            <CardTitle>Controle de entregas</CardTitle>
            <CardDescription>
              Atualize status de entrega e acesse o pedido relacionado.
            </CardDescription>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <Search placeholder="Buscar por cliente ou endereco..." />
            <StatusFilter />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden md:table-cell">Endereco</TableHead>
                  <TableHead className="hidden xl:table-cell">Itens</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveries.length > 0 ? (
                  deliveries.map((delivery) => (
                    <TableRow key={delivery.id}>
                      <TableCell className="font-medium">
                        {new Date(delivery.order.createdAt).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{delivery.order.customer.name}</div>
                        <div className="text-sm text-muted-foreground">{delivery.order.customer.phone}</div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {delivery.order.customer.street}, {delivery.order.customer.number}
                      </TableCell>
                      <TableCell className="hidden xl:table-cell max-w-xs">
                        <ItemsSummary items={delivery.order.items} />
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusUpdater deliveryId={delivery.id} currentStatus={delivery.status as DeliveryStatus} />
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <DeliveryWorkflowActions
                            deliveryId={delivery.id}
                            orderId={delivery.orderId}
                            status={delivery.status}
                            customer={delivery.order.customer}
                            items={delivery.order.items}
                            total={delivery.order.grossValue}
                            paymentMethod={delivery.order.paymentMethod}
                            hasOpenDebt={Boolean(delivery.order.debt && delivery.order.debt.status !== 'PAGO')}
                            driverWhatsapp={driverWhatsapp}
                          />
                          <div className="flex justify-end">
                            <Button asChild variant="ghost" size="sm">
                              <Link href={`/dashboard/vendas/${delivery.orderId}`}>Ver pedido</Link>
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <div className="mx-auto max-w-sm space-y-2">
                        <p className="font-medium">Nenhuma entrega encontrada</p>
                        <p className="text-sm text-muted-foreground">
                          Entregas aparecem aqui apos vendas confirmadas.
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
