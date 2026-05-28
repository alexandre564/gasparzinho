import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Box, Calendar, CreditCard, Home, Truck, User } from 'lucide-react';

import { getDriverWhatsappNumber } from '../../configuracoes/actions';
import { deliveryStatusLabels, labelFrom, paymentMethodLabels } from '@/lib/labels';
import { getDeliveryDetails } from '../actions';
import DeliveryWorkflowActions from '../DeliveryWorkflowActions';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
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


export const dynamic = 'force-dynamic';
const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

function statusVariant(status: string): BadgeProps['variant'] {
  if (status === 'ENTREGUE') return 'success';
  if (status === 'CANCELADA') return 'destructive';
  if (status === 'EM_ROTA') return 'default';
  return 'secondary';
}


export default async function DeliveryDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const [delivery, driverWhatsapp] = await Promise.all([
    getDeliveryDetails(params.id),
    getDriverWhatsappNumber(),
  ]);

  if (!delivery) {
    notFound();
  }

  const { order } = delivery;
  const customer = order.customer;
  const address = [
    `${customer.street}, ${customer.number}`,
    customer.complement,
    customer.neighborhood,
    customer.city,
    customer.cep ? `CEP ${customer.cep}` : '',
  ]
    .filter(Boolean)
    .join(' - ');

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="icon">
            <Link href="/dashboard/entregas" aria-label="Voltar para entregas">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-950">Detalhes da entrega</h1>
            <p className="text-sm text-slate-600">Pedido #{order.id.slice(-8).toUpperCase()}</p>
          </div>
        </div>
        <Badge variant={statusVariant(delivery.status)} className="w-fit text-sm">
          {labelFrom(deliveryStatusLabels, delivery.status)}
        </Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Fluxo da entrega
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DeliveryWorkflowActions
              deliveryId={delivery.id}
              orderId={delivery.orderId}
              status={delivery.status}
              customer={customer}
              items={order.items}
              total={order.grossValue}
              paymentMethod={order.paymentMethod}
              hasOpenDebt={Boolean(order.debt && order.debt.status !== 'PAGO')}
              driverWhatsapp={driverWhatsapp}
            />
            <div className="grid gap-3 rounded-lg border bg-slate-50 p-4 text-sm md:grid-cols-2">
              <div className="flex items-start gap-2">
                <User className="mt-0.5 h-4 w-4 text-slate-500" />
                <div>
                  <p className="font-semibold text-slate-950">{customer.name}</p>
                  <p className="text-slate-600">{customer.phone}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Home className="mt-0.5 h-4 w-4 text-slate-500" />
                <p className="text-slate-700">{address}</p>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="mt-0.5 h-4 w-4 text-slate-500" />
                <p className="text-slate-700">
                  Criado em {new Date(order.createdAt).toLocaleString('pt-BR')}
                </p>
              </div>
              <div className="flex items-start gap-2">
                <CreditCard className="mt-0.5 h-4 w-4 text-slate-500" />
                <p className="text-slate-700">
                  Pagamento: {labelFrom(paymentMethodLabels, order.paymentMethod)}
                  {order.paymentDueDate
                    ? ` - vencimento ${new Date(order.paymentDueDate).toLocaleDateString('pt-BR')}`
                    : ''}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumo financeiro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span>Valor bruto</span>
              <strong>{formatCurrency(order.grossValue)}</strong>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Custo</span>
              <span>{formatCurrency(order.totalCost)}</span>
            </div>
            <div className="flex justify-between border-t pt-3">
              <span>Lucro</span>
              <strong>{formatCurrency(order.netValue)}</strong>
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link href={`/dashboard/vendas/${order.id}`}>Ver pedido completo</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Box className="h-5 w-5" />
            Itens do pedido
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead className="text-center">Qtd.</TableHead>
                <TableHead className="text-right">Unitário</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.product.name}</TableCell>
                  <TableCell className="text-center">{item.quantity}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(item.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
