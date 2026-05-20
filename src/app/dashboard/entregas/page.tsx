
import { Suspense } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

import { getPaginatedDeliveries } from './actions';
import { DeliveryStatus } from "@/types/enums";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Pagination from '@/components/Pagination';
import {Search} from '@/components/Search';
import StatusFilter from './StatusFilter';
import StatusUpdater from './StatusUpdater';

const ItemsSummary = ({ items }: { items: { product: { name: string }, quantity: number }[] }) => {
    const summary = items.map(item => `${item.quantity}x ${item.product.name}`).join(', ');
    if (summary.length > 50) {
        return <span title={summary}>{summary.substring(0, 50)}...</span>
    }
    return <span>{summary}</span>;
}

export default async function DeliveriesPage({ searchParams }: { searchParams?: { query?: string; page?: string; status?: DeliveryStatus; } }) {
  const query = searchParams?.query || '';
  const currentPage = Number(searchParams?.page) || 1;
  const status = searchParams?.status;

  const { deliveries, totalPages } = await getPaginatedDeliveries(query, currentPage, status);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Entregas</h1>

       <Card>
        <CardHeader>
            <CardTitle>Controle de Entregas</CardTitle>
            <CardDescription>Gerencie o status e a logística das suas entregas.</CardDescription>
             <div className="pt-4 flex items-center gap-4">
                <Search placeholder="Buscar por cliente, endereço..." />
                <StatusFilter />
            </div>
        </CardHeader>
        <CardContent>
            <Suspense fallback={<div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin"/></div>}>
                 <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data Pedido</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead className="hidden md:table-cell">Endereço</TableHead>
                        <TableHead className="hidden lg:table-cell">Itens</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead><span className="sr-only">Ações</span></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deliveries.length > 0 ? deliveries.map((delivery) => (
                        <TableRow key={delivery.id}>
                           <TableCell className="font-medium">{new Date(delivery.order.createdAt).toLocaleDateString('pt-BR')}</TableCell>
                           <TableCell>{delivery.order.customer.name}</TableCell>
                           <TableCell className="hidden md:table-cell">{`${delivery.order.customer.street}, ${delivery.order.customer.number}`}</TableCell>
                           <TableCell className="hidden lg:table-cell"><ItemsSummary items={delivery.order.items} /></TableCell>
                           <TableCell className="text-center">
                                <StatusUpdater deliveryId={delivery.id} currentStatus={(delivery as any).deliveryStatus || delivery.status as any} />
                           </TableCell>
                           <TableCell className="text-right">
                                <Link href={`/dashboard/vendas/${delivery.orderId}`}>
                                    <Button variant="outline" size="sm">Ver Pedido</Button>
                                </Link>
                           </TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">Nenhuma entrega encontrada.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
            </Suspense>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Pagination totalPages={totalPages} />
      </div>
    </div>
  );
}
