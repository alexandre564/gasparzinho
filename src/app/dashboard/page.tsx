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
  tone = 'emerald',
}: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: 'emerald' | 'blue' | 'amber' | 'rose' | 'slate';
}) {
  const toneClass = {
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    blue: 'bg-sky-50 text-sky-700 ring-sky-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    rose: 'bg-rose-50 text-rose-700 ring-rose-100',
    slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  }[tone];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-semibold text-slate-600">{title}</CardTitle>
        <div className={`rounded-md p-2 ring-1 ${toneClass}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight text-slate-950">{value}</div>
        <p className="mt-1 text-xs font-medium text-slate-600">{description}</p>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950 text-white shadow-xl shadow-slate-300/60">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.3fr_0.7fr] lg:p-7">
          <div>
            <p className="text-sm font-semibold text-emerald-300">Resumo da operação</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Gás Gasparzinho em movimento</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Acompanhe vendas, entregas, estoque e cobranças em um painel mais claro para decidir rápido.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-white/10 bg-white/10 p-4">
              <p className="text-slate-300">Vendas hoje</p>
              <p className="mt-1 text-xl font-bold text-white">{currency.format(data.totalSalesToday)}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-emerald-500 p-4 text-white">
              <p className="text-emerald-50">Entregas</p>
              <p className="mt-1 text-xl font-bold">{data.deliveriesInProgress}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          title="Vendas hoje"
          value={currency.format(data.totalSalesToday)}
          description="Total bruto vendido desde o início do dia."
          icon={Banknote}
          tone="emerald"
        />
        <MetricCard
          title="Clientes"
          value={data.activeCustomers}
          description="Cadastros disponíveis para venda e entrega."
          icon={Users}
          tone="blue"
        />
        <MetricCard
          title="Dívidas abertas"
          value={data.debtors}
          description="Clientes com cobrança pendente ou vencida."
          icon={CreditCard}
          tone="rose"
        />
        <MetricCard
          title="Estoque crítico"
          value={data.criticalStock}
          description="Produtos com menos de 10 unidades."
          icon={Package}
          tone="amber"
        />
        <MetricCard
          title="Entregas em andamento"
          value={data.deliveriesInProgress}
          description="Entregas pendentes ou em rota."
          icon={Truck}
          tone="blue"
        />
        <MetricCard
          title="Recompra"
          value="Em breve"
          description="Previsões serão calculadas após mais vendas."
          icon={Repeat}
          tone="slate"
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
          <CardContent className="space-y-3">
            {data.recentOrders.length > 0 ? (
              data.recentOrders.map((order) => (
                <div key={order.id} className="flex items-start justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-3 last:mb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">{order.customer.name}</p>
                    <p className="text-xs text-slate-600">
                      {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-950">{currency.format(order.grossValue)}</p>
                    <Badge variant="secondary" className="mt-1">{order.status}</Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600">
                Nenhum pedido registrado ainda.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
