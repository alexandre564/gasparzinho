import Link from 'next/link';
import { Download, MapPinned, Truck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState, PageHeader, SectionCard } from '@/components/PageShell';
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
import DeliveryDateRangeFilter from './DeliveryDateRangeFilter';
import { getPaginatedDeliveries } from './actions';
import { getDriverWhatsappNumber } from '../configuracoes/actions';
import { buildGoogleMapsRouteUrl } from '@/lib/maps';
import { requirePageAccess } from '@/lib/page-auth';


export const dynamic = 'force-dynamic';

function hasDeliveryAddressNumber(value: string | null | undefined) {
  const address = value ?? '';
  return (
    /,\s*(\d+[A-Za-z]?|s\/n|sn)\b/i.test(address) ||
    /\b(n|no|numero)\s*[:.]?\s*(\d+[A-Za-z]?|s\/n|sn)\b/i.test(address)
  );
}

function hasUsableDeliveryAddress(value: string | null | undefined) {
  const address = (value ?? '').replace(/\s+/g, ' ').trim();
  return address.length >= 8 && /[A-Za-zÀ-ÿ]/.test(address) && hasDeliveryAddressNumber(address);
}

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
  searchParams?: { query?: string; page?: string; status?: DeliveryStatus; from?: string; to?: string };
}) {
  await requirePageAccess(['ADMIN', 'ENTREGADOR']);

  const query = searchParams?.query ?? '';
  const currentPage = Number(searchParams?.page) || 1;
  const status = searchParams?.status;
  const from = searchParams?.from;
  const to = searchParams?.to;
  const exportParams = new URLSearchParams();

  if (query) exportParams.set('query', query);
  if (status) exportParams.set('status', status);
  if (from) exportParams.set('from', from);
  if (to) exportParams.set('to', to);

  const exportHref = `/api/entregas/exportar${exportParams.toString() ? `?${exportParams.toString()}` : ''}`;
  const [deliveryData, driverWhatsapp] = await Promise.all([
    getPaginatedDeliveries(query, currentPage, status, from, to),
    getDriverWhatsappNumber(),
  ]);
  const deliveries = deliveryData.deliveries ?? [];
  const totalPages = deliveryData.totalPages ?? 1;
  const deliveryRows = deliveries.map((delivery) => {
    const customerAddress = [
      `${delivery.order.customer.street}, ${delivery.order.customer.number}`,
      delivery.order.customer.neighborhood,
      delivery.order.customer.city,
    ]
      .filter(Boolean)
      .join(' - ');
    const deliveryAddress = delivery.order.deliveryAddress || customerAddress;
    const deliveryReference = delivery.order.deliveryReference || delivery.order.customer.reference;
    const missingAddress = !hasUsableDeliveryAddress(deliveryAddress);

    return {
      delivery,
      deliveryAddress,
      deliveryReference,
      missingAddress,
    };
  });
  const routeAddresses = deliveryRows
    .filter(({ delivery, missingAddress }) => !missingAddress && delivery.status !== 'ENTREGUE' && delivery.status !== 'CANCELADA')
    .map(({ deliveryAddress }) => deliveryAddress);
  const routeHref = buildGoogleMapsRouteUrl(routeAddresses);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operação"
        title="Entregas"
        description="Acompanhe endereços, itens, rotas e andamento das entregas em uma leitura operacional."
        icon={Truck}
        actions={
          <>
          {routeHref !== '#' ? (
            <Button asChild variant="outline" size="sm" className="gap-2">
              <a href={routeHref} target="_blank" rel="noreferrer">
                <MapPinned className="h-4 w-4" />
                Roteiro Maps
              </a>
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="gap-2" disabled>
              <MapPinned className="h-4 w-4" />
              Roteiro Maps
            </Button>
          )}
          <Button asChild variant="outline" size="sm" className="gap-2">
            <a href={exportHref} download>
              <Download className="h-4 w-4" />
              Exportar CSV
            </a>
          </Button>
          </>
        }
      />

      <SectionCard
        title="Controle de entregas"
        description="Atualize status de entrega e acesse o pedido relacionado."
      >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <Search placeholder="Buscar por cliente, telefone, endereço ou status..." />
            <StatusFilter />
          </div>
          <DeliveryDateRangeFilter />
        <div className="mt-5">
          <div className="overflow-x-auto rounded-md border">
            <Table className="min-w-[980px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden md:table-cell">Endereço</TableHead>
                  <TableHead className="hidden xl:table-cell">Itens</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveryRows.length > 0 ? (
                  deliveryRows.map(({ delivery, deliveryAddress, deliveryReference, missingAddress }) => {
                    return (
                    <TableRow key={delivery.id} className={missingAddress ? 'bg-red-50/60' : undefined}>
                      <TableCell className="font-medium">
                        {new Date(delivery.order.createdAt).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{delivery.order.customer.name}</div>
                        <div className="text-sm text-muted-foreground">{delivery.order.customer.phone}</div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {missingAddress ? (
                          <div className="space-y-1">
                            <Badge variant="destructive">Endereco pendente</Badge>
                            <p className="text-xs text-red-700">Complete o cadastro ou informe outro endereco no pedido.</p>
                          </div>
                        ) : (
                          <span title={deliveryAddress} className="line-clamp-2">
                            {deliveryAddress}
                          </span>
                        )}
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
                            deliveryAddress={deliveryAddress}
                            deliveryReference={deliveryReference}
                            deliveryAddressChanged={delivery.order.deliveryAddressChanged}
                          />
                          <div className="flex justify-end">
                            <Button asChild variant="ghost" size="sm">
                              <Link href={`/dashboard/vendas/${delivery.orderId}`}>Ver pedido</Link>
                            </Button>
                            <Button asChild variant="ghost" size="sm">
                              <Link href={`/dashboard/entregas/${delivery.id}`}>Detalhes</Link>
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <EmptyState title="Nenhuma entrega encontrada" description="Entregas aparecem aqui após vendas confirmadas." />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <Pagination totalPages={totalPages} />
        </div>
      </SectionCard>
    </div>
  );
}
