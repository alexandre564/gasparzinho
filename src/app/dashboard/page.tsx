import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Banknote, CreditCard, Package, Repeat, ShoppingCart, Truck, Users } from 'lucide-react';
import SalesChart from '@/components/SalesChart';

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

async function getDashboardData() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [salesToday, activeCustomers, debtors, criticalStock, deliveriesInProgress, recentOrders] =
    await Promise.all([
      prisma.order.aggregate({
        _sum: { grossValue: true },
        where: { createdAt: { gte: today }, status: { not: 'CANCELADO' } },
      }),
      prisma.customer.count(),
      prisma.debt.count({ where: { status: { in: ['PENDENTE', 'VENCIDO'] } } }),
      prisma.product.count({ where: { inventory: { lt: 10 } } }),
      prisma.delivery.count({ where: { status: { in: ['PENDENTE', 'EM_ROTA'] } } }),
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { customer: true },
      }),
    ]);

  const salesData = await Promise.all(
    Array.from({ length: 7 }).map(async (_, index) => {
      const start = new Date();
      start.setDate(start.getDate() - index);
      start.setHours(0, 0, 0, 0);

      const end = new Date(start);
      end.setHours(23, 59, 59, 999);

      const dailySales = await prisma.order.aggregate({
        _sum: { grossValue: true },
        where: {
          createdAt: { gte: start, lte: end },
          status: { not: 'CANCELADO' },
        },
      });

      return {
        name: start.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
        total: dailySales._sum.grossValue ?? 0,
      };
    })
  ).then((data) => data.reverse());

  return {
    totalSalesToday: salesToday._sum.grossValue ?? 0,
    activeCustomers,
    debtors,
    criticalStock,
    deliveriesInProgress,
    recentOrders,
    salesData,
  };
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Resumo da operação</h2>
        <p className="text-sm text-muted-foreground">
          Acompanhe vendas, entregas, estoque e cobranças em um só lugar.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          title="Vendas hoje"
          value={currency.format(data.totalSalesToday)}
          description="Total bruto vendido desde o início do dia."
          icon={Banknote}
        />
        <MetricCard
          title="Clientes"
          value={data.activeCustomers}
          description="Cadastros disponíveis para venda e entrega."
          icon={Users}
        />
        <MetricCard
          title="Dívidas abertas"
          value={data.debtors}
          description="Clientes com cobrança pendente ou vencida."
          icon={CreditCard}
        />
        <MetricCard
          title="Estoque crítico"
          value={data.criticalStock}
          description="Produtos com menos de 10 unidades."
          icon={Package}
        />
        <MetricCard
          title="Entregas em andamento"
          value={data.deliveriesInProgress}
          description="Entregas pendentes ou em rota."
          icon={Truck}
        />
        <MetricCard
          title="Recompra"
          value="Em breve"
          description="Previsões serão calculadas após mais vendas."
          icon={Repeat}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Vendas dos últimos 7 dias</CardTitle>
            <CardDescription>Valor bruto por dia, sem pedidos cancelados.</CardDescription>
          </CardHeader>
          <CardContent>
            <SalesChart data={data.salesData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pedidos recentes</CardTitle>
            <CardDescription>Últimas movimentações registradas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.recentOrders.length > 0 ? (
              data.recentOrders.map((order) => (
                <div key={order.id} className="flex items-start justify-between gap-3 border-b pb-3 last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{order.customer.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{currency.format(order.grossValue)}</p>
                    <Badge variant="secondary" className="mt-1">{order.status}</Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                Nenhum pedido registrado ainda.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}