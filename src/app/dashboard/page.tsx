// @ts-nocheck

import { prisma } from '@/lib/prisma';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DollarSign, Users, CreditCard, Package, Truck, Repeat } from 'lucide-react';
import SalesChart from '@/components/SalesChart';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { MessageCircle } from 'lucide-react';

async function getDashboardData() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const totalSalesToday = await prisma.order.aggregate({
    _sum: { grossValue: true },
    where: { createdAt: { gte: today } },
  });

  const activeCustomers = await prisma.customer.count({
    where: { debts: { none: {} } }, // Simplificação: clientes ativos são os que não têm dívidas
  });

  const debtors = await prisma.debt.count({
    where: { status: { in: ['PENDING', 'OVERDUE'] } },
  });

  const criticalStock = await prisma.product.count({
    where: { inventory: { lt: 10 } }, // Exemplo: estoque crítico abaixo de 10 unidades
  });

  const deliveriesInProgress = await prisma.delivery.count({
    where: { status: 'PENDENTE' },
  });

  const recompraOpportunities = await [];

  // Dados para o gráfico - Exemplo com dados dos últimos 7 dias
  const salesData = await Promise.all(
    Array.from({ length: 7 }).map(async (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const day = date.toISOString().split('T')[0];

        const dailySales = await prisma.order.aggregate({
            _sum: { grossValue: true },
            where: { createdAt: { gte: new Date(day), lt: new Date(day + 'T23:59:59') } },
        });

        return {
            name: date.toLocaleDateString('pt-BR', { weekday: 'short' }),
            total: dailySales._sum.grossValue || 0,
        };
    })
  ).then(data => data.reverse());

  return {
    totalSalesToday: totalSalesToday._sum.grossValue || 0,
    activeCustomers,
    debtors,
    criticalStock,
    deliveriesInProgress,
    recompraOpportunities: recompraOpportunities.slice(0,3), // Pegando os 3 primeiros
    salesData,
  };
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="grid gap-4 md:gap-8 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Vendas Hoje</CardTitle>
          <DollarSign className="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">R$ {data.totalSalesToday.toFixed(2)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
          <Users className="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.activeCustomers}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Clientes Devedores</CardTitle>
          <CreditCard className="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.debtors}</div>
        </CardContent>
      </Card>
       <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Estoque Crítico</CardTitle>
          <Package className="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.criticalStock}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Entregas em Andamento</CardTitle>
          <Truck className="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.deliveriesInProgress}</div>
        </CardContent>
      </Card>
       <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Oportunidades de Recompra</CardTitle>
           <Repeat className="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.recompraOpportunities.length}</div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2 lg:col-span-3">
        <CardHeader>
          <CardTitle>Vendas (Últimos 7 Dias)</CardTitle>
        </CardHeader>
        <CardContent className="pl-2">
           <SalesChart data={data.salesData} />
        </CardContent>
      </Card>

      <Card className="md:col-span-2 lg:col-span-3">
        <CardHeader>
          <CardTitle>Oportunidades de Recompra (Próximos 3 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-gray-200">
            {data.recompraOpportunities.map((opp: Record<string,unknown>) => (
              <li key={opp.customerId} className="py-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{opp.customerName}</p>
                  <p className="text-sm text-muted-foreground">Última compra: {new Date(opp.lastOrderDate).toLocaleDateString()}</p>
                  <p className="text-sm text-muted-foreground">Previsão: {new Date(opp.predictedNextPurchase).toLocaleDateString()}</p>
                </div>
                <Button asChild size="sm">
                    <Link href={`https://wa.me/55${opp.customerPhone.replace(/\D/g, '')}?text=Olá ${opp.customerName}, vimos que sua última compra foi em ${new Date(opp.lastOrderDate).toLocaleDateString()}. Está precisando de algo?`}>
                       <MessageCircle className="h-4 w-4 mr-2"/> Chamar no WhatsApp
                    </Link>
                </Button>
              </li>
            ))}
          </ul>
           {data.recompraOpportunities.length === 0 && (
                <p className="text-center text-muted-foreground py-4">Nenhuma oportunidade de recompra encontrada para os próximos 3 dias.</p>
           )}
        </CardContent>
      </Card>

    </div>
  );
}

