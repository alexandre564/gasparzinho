
import { Suspense } from 'react';
import Link from 'next/link';
import { PlusCircle, Loader2 } from 'lucide-react';

import { getPaginatedOrders } from './actions';
import { OrderStatus } from "@/types/enums";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import Pagination from '@/components/Pagination';
import { Search } from '@/components/Search';
import { StatusFilter } from './StatusFilter';
import { DateFilter } from './DateFilter';

const formatCurrency = (value: number | null) => 
    value ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value) : 'N/A';

const getStatusVariant = (status: OrderStatus) => {
  switch (status) {
    case 'CONFIRMADO': return 'success';
    case 'PENDENTE': return 'secondary';
    case 'CANCELADO': return 'destructive';
    default: return 'outline';
  }
};

export default async function OrdersPage({ 
    searchParams 
}: { 
    searchParams?: { 
        query?: string; 
        page?: string; 
        status?: OrderStatus; 
        startDate?: string;
        endDate?: string;
    } 
}) {
  const query = searchParams?.query || '';
  const currentPage = Number(searchParams?.page) || 1;
  const status = searchParams?.status;
  const startDate = searchParams?.startDate;
  const endDate = searchParams?.endDate;

  const { orders, totalPages } = await getPaginatedOrders(query, currentPage, status, startDate, endDate);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Vendas</h1>
        <Link href="/dashboard/vendas/novo">
            <Button size="sm" className="h-8 gap-1">
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Nova Venda</span>
            </Button>
        </Link>
      </div>

       <Card>
        <CardHeader>
            <CardTitle>Histórico de Vendas</CardTitle>
            <CardDescription>Visualize e gerencie todos os seus pedidos.</CardDescription>
             <div className="pt-4 flex items-center gap-4">
                <Search placeholder="Buscar por cliente ou ID..." />
                <StatusFilter />
                <DateFilter />
            </div>
        </CardHeader>
        <CardContent>
            <Suspense fallback={<div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin"/></div>}>
                 <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Valor Bruto</TableHead>
                        <TableHead className="hidden md:table-cell text-right">Custo</TableHead>
                        <TableHead className="hidden md:table-cell text-right">Valor Líquido</TableHead>
                        <TableHead><span className="sr-only">Ações</span></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.length > 0 ? orders.map((order) => (
                        <TableRow key={order.id}>
                           <TableCell className="font-medium">{new Date(order.createdAt).toLocaleDateString('pt-BR')}</TableCell>
                           <TableCell>{order.customer.name}</TableCell>
                           <TableCell><Badge variant={getStatusVariant(order.status)}>{order.status}</Badge></TableCell>
                           <TableCell className="text-right">{formatCurrency(order.grossValue)}</TableCell>
                           <TableCell className="hidden md:table-cell text-right">{formatCurrency(order.totalCost)}</TableCell>
                           <TableCell className="hidden md:table-cell text-right font-semibold">{formatCurrency(Number(order.netValue))}</TableCell>
                           <TableCell className="text-right">
                                <Link href={`/dashboard/vendas/${order.id}`}>
                                    <Button variant="outline" size="sm">Ver Detalhes</Button>
                                </Link>
                           </TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center">Nenhum pedido encontrado.</TableCell>
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
