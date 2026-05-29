import { notFound } from 'next/navigation';
import { getOrderDetails } from '../actions';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  MapPinned,
  Navigation,
  User,
  ShoppingCart,
  Truck,
  CreditCard,
  Package,
} from 'lucide-react';
import CancelOrderButton from './CancelOrderButton';
import { OrderStatus } from "@/types/enums";
import { deliveryStatusLabels, labelFrom, orderStatusLabels, paymentMethodLabels } from '@/lib/labels';
import { buildGoogleMapsUrl, buildWazeUrl } from '@/lib/maps';


export const dynamic = 'force-dynamic';
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


export default async function OrderDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const order = await getOrderDetails(params.id);

  if (!order) {
    notFound();
  }

  const customerAddress = [
    `${order.customer.street}, ${order.customer.number}`,
    order.customer.complement,
    order.customer.neighborhood,
    order.customer.city,
    order.customer.cep ? `CEP ${order.customer.cep}` : null,
  ]
    .filter(Boolean)
    .join(' - ');
  const deliveryAddress = order.deliveryAddress || customerAddress;
  const deliveryReference = order.deliveryReference || order.customer.reference;
  const googleMapsUrl = buildGoogleMapsUrl(deliveryAddress);
  const wazeUrl = buildWazeUrl(deliveryAddress);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/vendas">
            <Button variant="outline" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Voltar</span>
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Detalhes do pedido</h1>
            <p className="text-sm text-muted-foreground">ID: {order.id}</p>
          </div>
        </div>
        {order.status !== 'CANCELADO' && (
          <CancelOrderButton orderId={order.id} />
        )}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge
              variant={getStatusVariant(order.status as OrderStatus)}
              className="text-lg"
            >
              {labelFrom(orderStatusLabels, order.status)}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Entrega</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge
              variant={
                order.delivery?.status === 'ENTREGUE'
                  ? 'success'
                  : 'secondary'
              }
              className="text-lg"
            >
              {labelFrom(deliveryStatusLabels, order.delivery?.status, 'Sem entrega')}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pagamento</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {labelFrom(paymentMethodLabels, order.paymentMethod)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">
              {new Date(order.createdAt).toLocaleString('pt-BR')}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="mr-2" /> Itens do pedido
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-center">Qtd</TableHead>
                    <TableHead className="text-right">Preço un.</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.product.name}</TableCell>
                      <TableCell className="text-center">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(item.total))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2" /> Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p className="font-semibold text-base">{order.customer.name}</p>
              <p className="text-muted-foreground">{order.customer.phone}</p>
              <p className="text-muted-foreground">
                {`${order.customer.street}, ${order.customer.number}`}
              </p>
              <p className="text-muted-foreground">
                {order.customer.neighborhood}, {order.customer.city}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Truck className="mr-2" /> Entrega
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="font-semibold text-slate-900">{deliveryAddress || 'Endereço não informado'}</p>
              {deliveryReference ? (
                <p className="text-muted-foreground">Referência: {deliveryReference}</p>
              ) : null}
              {order.deliveryAddressChanged ? (
                <Badge variant="secondary">Endereço diferente do cadastro</Badge>
              ) : null}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button asChild size="sm" variant="outline" className="gap-2">
                  <a href={googleMapsUrl} target="_blank" rel="noreferrer" aria-label="Abrir entrega no Google Maps">
                    <MapPinned className="h-4 w-4" />
                    Maps
                  </a>
                </Button>
                <Button asChild size="sm" variant="outline" className="gap-2">
                  <a href={wazeUrl} target="_blank" rel="noreferrer" aria-label="Abrir entrega no Waze">
                    <Navigation className="h-4 w-4" />
                    Waze
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resumo financeiro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span>Valor bruto</span>
                <span>{formatCurrency(order.grossValue)}</span>
              </div>
              <div className="flex justify-between">
                <span>Custo dos produtos</span>
                <span className="text-red-500">
                  - {formatCurrency(order.totalCost)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Valor líquido (lucro)</span>
                <span>{formatCurrency(Number(order.netValue))}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
