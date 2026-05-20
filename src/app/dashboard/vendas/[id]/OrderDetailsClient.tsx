'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { FullOrder } from '@/types';

interface OrderDetailsClientProps {
  order: FullOrder;
}

const getStatusBadgeVariant = (status: string): BadgeProps['variant'] => {
  switch (status) {
    case 'PENDENTE':
      return 'secondary';
    case 'CONFIRMADO':
    case 'EM_PREPARO':
    case 'PRONTO':
      return 'default';
    case 'ENTREGUE':
      return 'success';
    case 'CANCELADO':
      return 'destructive';
    default:
      return 'outline';
  }
};

export function OrderDetailsClient({ order }: OrderDetailsClientProps) {
  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
      <div className="space-y-8 md:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Resumo do Pedido</CardTitle>
            <CardDescription>
              Os itens, total e dados de entrega não estão disponíveis no tipo atual do pedido.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Status do Pedido</span>
              <Badge variant={getStatusBadgeVariant(order.status)}>{order.status}</Badge>
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cliente</CardTitle>
            <CardDescription>{order.customer.phone}</CardDescription>
          </CardHeader>

          <CardContent>
            <p className="font-medium">{order.customer.name}</p>
            <p className="text-sm text-muted-foreground">
              {order.customer.street}, {order.customer.number}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
