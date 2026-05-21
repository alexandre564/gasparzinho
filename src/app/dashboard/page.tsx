import { Banknote, CreditCard, Package, Repeat, Truck, Users } from 'lucide-react';
import type { ComponentType } from 'react';

import SalesChart from '@/components/SalesChart';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { prisma } from '@/lib/prisma';
import { getRepurchasePredictions } from './recompra/actions';

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

async function getDashboardData() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [salesToday, activeCustomers, debtors, criticalStock, deliveriesInProgress, recentOrders, repurchaseOpportunities] =
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
      getRepurchasePredictions(3),
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
    }),
  ).then((data) => data.reverse());

  return {
    totalSalesToday: salesToday._sum.grossValue ?? 0,
    activeCustomers,
    debtors,
    criticalStock,
    deliveriesInProgress,
    recentOrders,
    repurchaseOpportunities: repurchaseOpportunities.length,
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
  icon: ComponentType<{ className?: string }>;
  tone?: 'emerald' | 'blue' | 'amber' | 'rose' | 'slate';
}) {
  const toneClass = {
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    blue: 'bg-sky-50 text-sky-700 ring-sky-200',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200',
    rose: 'bg-rose-50 text-rose-700 ring-rose-200',
    slate: 'bg-slate-100 text-slate-700 ring-slate-300',
  }[tone];

  return (
    <Card className="overflow-hidden border-slate-300 shadow-lg shadow-slate-200/80">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 border-b border-slate-200 bg-slate-50 pb-3">
        <CardTitle className="text-base font-extrabold uppercase tracking-wide text-slate-950">
          {title}
        </CardTitle>
        <div className={`rounded-md p-2 ring-1 ${toneClass}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="pt-5">
        <div className="text-3xl font-extrabold tracking-tight text-slate-950">{value}</div>
        <p className="mt-2 text-sm font-medium leading-5 text-slate-700">{description}</p>
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
            <p className="text-sm font-semibold text-emerald-300">Pagina principal</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Gas Gasparzinho em movimento
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Acompanhe vendas, entregas, estoque e cobrancas em um painel mais claro para decidir rapido.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-white/10 bg-white/10 p-4">
              <p className="font-bold uppercase text-slate-100">Vendas hoje</p>
              <p className="mt-1 text-xl font-bold text-white">{currency.format(data.totalSalesToday)}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-emerald-500 p-4 text-white">
              <p className="font-bold uppercase text-emerald-50">Entregas</p>
              <p className="mt-1 text-xl font-bold">{data.deliveriesInProgress}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          title="Vendas hoje"
          value={currency.format(data.totalSalesToday)}
          description="Total bruto vendido desde o inicio do dia."
          icon={Banknote}
          tone="emerald"
        />
        <MetricCard
          title="Clientes"
          value={data.activeCustomers}
          description="Cadastros disponiveis para venda e entrega."
          icon={Users}
          tone="blue"
        />
        <MetricCard
          title="Dividas abertas"
          value={data.debtors}
          description="Clientes com cobranca pendente ou vencida."
          icon={CreditCard}
          tone="rose"
        />
        <MetricCard
          title="Estoque critico"
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
          value={data.repurchaseOpportunities}
          description="Clientes com previsao de recompra nos proximos 3 dias."
          icon={Repeat}
          tone="slate"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Card className="border-slate-300">
          <CardHeader className="border-b border-slate-200 bg-slate-50">
            <CardTitle className="text-xl font-extrabold text-slate-950">Vendas dos ultimos 7 dias</CardTitle>
            <CardDescription>Valor bruto por dia, sem pedidos cancelados.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <SalesChart data={data.salesData} />
          </CardContent>
        </Card>

        <Card className="border-slate-300">
          <CardHeader className="border-b border-slate-200 bg-slate-50">
            <CardTitle className="text-xl font-extrabold text-slate-950">Pedidos recentes</CardTitle>
            <CardDescription>Ultimas movimentacoes registradas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-6">
            {data.recentOrders.length > 0 ? (
              data.recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-start justify-between gap-3 rounded-md border border-slate-300 bg-slate-50 px-3 py-3 shadow-sm last:mb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-950">{order.customer.name}</p>
                    <p className="text-xs font-medium text-slate-600">
                      {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-extrabold text-slate-950">{currency.format(order.grossValue)}</p>
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
