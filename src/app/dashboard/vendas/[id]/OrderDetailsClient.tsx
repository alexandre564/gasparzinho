'use client';

import { useState, useTransition } from 'react';
import { OrderStatus } from "@/types/enums";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { updateOrderStatus } from '@/actions/order-actions';
import { toast } from 'sonner';
import { FullOrder } from '@/types'; // Importa o tipo centralizado

// Lista de status para o menu dropdown
const availableStatus: OrderStatus[] = ['PENDENTE', 'PROCESSANDO', 'ENVIADO', 'ENTREGUE', 'CANCELADO'];

interface OrderDetailsClientProps {
  order: FullOrder;
}

export function OrderDetailsClient({ order: initialOrder }: OrderDetailsClientProps) {
    const [order, setOrder] = useState(initialOrder);
    const [isPending, startTransition] = useTransition();

    const handleStatusChange = (newStatus: OrderStatus) => {
        startTransition(async () => {
            const result = await updateOrderStatus(order.id, newStatus);
            if (result.success && result.order) {
                setOrder(prevOrder => ({ ...prevOrder, ...result.order }));
                toast.success(`Pedido atualizado para ${newStatus}!`);
            } else {
                toast.error(result.message || "Falha ao atualizar o pedido.");
            }
        });
    };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div className="md:col-span-2 space-y-8">
        <Card>
            <CardHeader><CardTitle>Itens do Pedido</CardTitle></CardHeader>
            <CardContent>
                <ul className="divide-y">
                {order.items.map(item => (
                    <li key={item.id} className="flex justify-between items-center py-4">
                    <div>
                        <p className="font-semibold">{item.product.name}</p>
                        <p className="text-sm text-muted-foreground">{item.quantity} x {formatCurrency(Number(Number(item.price)) as unknown as number)}</p>
                    </div>
                    <p className="font-medium">{formatCurrency((item.quantity * (item.price as unknown as number)))}</p>
                    </li>
                ))}
                </ul>
            </CardContent>
            <CardFooter className="flex justify-end font-bold text-xl">Total: {formatCurrency(Number(Number(order.total)) as unknown as number)}</CardFooter>
        </Card>
      </div>

      <div className="space-y-8">
        <Card>
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    <span>Status do Pedido</span>
                    <Badge variant={order.status}>{order.status}</Badge>
                </CardTitle>
            </CardHeader>
            <CardContent>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full" disabled={isPending}>
                            {isPending ? "Atualizando..." : "Alterar Status"}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {availableStatus.map(status => (
                            <DropdownMenuItem key={status} onSelect={() => handleStatusChange(status)} disabled={order.status === status}>
                                {status}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Cliente</CardTitle><CardDescription>{order.client.phone}</CardDescription></CardHeader>
          <CardContent>
            <p className="font-medium">{order.client.name}</p>
            <p className="text-sm text-muted-foreground">{order.client.street}, {order.client.number}</p>
          </CardContent>
        </Card>

        {order.delivery && (
           <Card>
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    <span>Entrega</span>
                    <Badge variant={order.delivery.status}>{order.delivery.status.replace('_',' ')}</Badge>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="font-medium">Entregador: {order.delivery.deliveryPersonId || 'N/A'}</p>
                <p className="text-sm text-muted-foreground">Última atualização: {formatDateTime(order.delivery.updatedAt)}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
