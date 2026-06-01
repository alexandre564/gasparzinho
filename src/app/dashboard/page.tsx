import Link from 'next/link';
import { AlertTriangle, Banknote, CreditCard, Package, Repeat, TrendingUp, Truck, Users } from 'lucide-react';
import type { ComponentType } from 'react';

import SalesChart from '@/components/SalesChart';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { prisma } from '@/lib/prisma';
import { labelFrom, orderStatusLabels } from '@/lib/labels';
import { getLoyaltyPredictions } from './fidelizacao/actions';
import { decodeContactText } from '@/lib/contact-text';
import { buildBranchWhere } from '@/lib/branch-scope';
import { getCurrentBranchScope } from '@/lib/current-branch-scope';

export const dynamic = 'force-dynamic';

const OPEN_DEBT_STATUSES = ['PENDENTE', 'VENCIDO', 'RENEGOCIADO'] as const;

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

async function getDashboardData() {
  const branchScope = await getCurrentBranchScope();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today);
  monthStart.setDate(1);

  const [
    salesToday,
    salesMonth,
    expensesMonth,
    openDebtValue,
    overdueDebts,
    activeCustomers,
    debtors,
    criticalStock,
    deliveriesWithChangedAddress,
    deliveriesInProgress,
    recentOrders,
    loyaltyOpportunities,
  ] = await Promise.all([
    prisma.order.aggregate({
      _sum: { grossValue: true },
      _count: { id: true },
      where: buildBranchWhere(branchScope, { createdAt: { gte: today }, status: { not: 'CANCELADO' } }),
    }),
    prisma.order.aggregate({
      _sum: { grossValue: true, netValue: true },
      _count: { id: true },
      where: buildBranchWhere(branchScope, { createdAt: { gte: monthStart }, status: { not: 'CANCELADO' } }),
    }),
    prisma.expense.aggregate({
      _sum: { value: true },
      where: buildBranchWhere(branchScope, { date: { gte: monthStart } }),
    }),
    prisma.debt.findMany({
      select: { value: true, renegotiatedValue: true },
      where: buildBranchWhere(branchScope, { status: { in: [...OPEN_DEBT_STATUSES] } }),
    }),
    prisma.debt.count({
      where: buildBranchWhere(branchScope, { status: { in: [...OPEN_DEBT_STATUSES] }, dueDate: { lt: today } }),
    }),
    prisma.customer.count({ where: buildBranchWhere(branchScope) }),
    prisma.debt.count({ where: buildBranchWhere(branchScope, { status: { in: [...OPEN_DEBT_STATUSES] } }) }),
    prisma.product.count({ where: buildBranchWhere(branchScope, { inventory: { lt: 10 } }) }),
    prisma.delivery.count({
      where: buildBranchWhere(branchScope, {
        status: { in: ['PENDENTE', 'EM_ROTA'] },
        order: { deliveryAddressChanged: true },
      }),
    }),
    prisma.delivery.count({ where: buildBranchWhere(branchScope, { status: { in: ['PENDENTE', 'EM_ROTA'] } }) }),
    prisma.order.findMany({
      where: buildBranchWhere(branchScope),
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { customer: true },
    }),
    getLoyaltyPredictions(3),
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
        where: buildBranchWhere(branchScope, {
          createdAt: { gte: start, lte: end },
          status: { not: 'CANCELADO' },
        }),
      });

      return {
        name: start.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
        total: dailySales._sum.grossValue ?? 0,
      };
    }),
  ).then((data) => data.reverse());

  return {
    totalSalesToday: salesToday._sum.grossValue ?? 0,
    salesTodayCount: salesToday._count.id,
    averageTicketToday:
      salesToday._count.id > 0 ? (salesToday._sum.grossValue ?? 0) / salesToday._count.id : 0,
    monthRevenue: salesMonth._sum.grossValue ?? 0,
    monthProfit: (salesMonth._sum.netValue ?? 0) - (expensesMonth._sum.value ?? 0),
    monthOrders: salesMonth._count.id,
    monthExpenses: expensesMonth._sum.value ?? 0,
    openDebtValue: openDebtValue.reduce((sum, debt) => sum + (debt.renegotiatedValue ?? debt.value), 0),
    overdueDebts,
    activeCustomers,
    debtors,
    criticalStock,
    deliveriesWithChangedAddress,
    deliveriesInProgress,
    recentOrders,
    loyaltyOpportunities: loyaltyOpportunities.length,
    salesData,
  };
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  tone = 'emerald',
  href,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: ComponentType<{ className?: string }>;
  tone?: 'emerald' | 'blue' | 'amber' | 'rose' | 'slate';
  href?: string;
}) {
  const toneClass = {
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    blue: 'bg-sky-50 text-sky-700 ring-sky-200',
    amber: 'bg-amber-50 text-amber-700 ring-amber-200',
    rose: 'bg-rose-50 text-rose-700 ring-rose-200',
    slate: 'bg-slate-100 text-slate-700 ring-slate-300',
  }[tone];

  const card = (
    <Card className="h-full overflow-hidden border-slate-300 shadow-lg shadow-slate-200/80 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-xl">
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

  if (!href) {
    return card;
  }

  return (
    <Link href={href} className="block h-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
      {card}
    </Link>
  );
}

function OperationalAlert({
  title,
  description,
  href,
  tone = 'amber',
}: {
  title: string;
  description: string;
  href: string;
  tone?: 'amber' | 'rose' | 'sky';
}) {
  const toneClass = {
    amber: 'border-amber-300 bg-amber-50 text-amber-900',
    rose: 'border-rose-300 bg-rose-50 text-rose-900',
    sky: 'border-sky-300 bg-sky-50 text-sky-900',
  }[tone];

  return (
    <Link
      href={href}
      className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-sm transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${toneClass}`}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        <strong className="block">{title}</strong>
        <span className="mt-0.5 block opacity-85">{description}</span>
      </span>
    </Link>
  );
}

type OperationalAlertItem = {
  title: string;
  description: string;
  href: string;
  tone: 'amber' | 'rose' | 'sky';
};

export default async function DashboardPage() {
  const data = await getDashboardData();
  const operationalAlerts: OperationalAlertItem[] = [];

  if (data.overdueDebts > 0) {
    operationalAlerts.push({
      title: `${data.overdueDebts} cobrança(s) vencida(s)`,
      description: 'Priorize clientes em atraso antes de novas vendas fiadas.',
      href: '/dashboard/cobranca?sort=daysLate&direction=desc',
      tone: 'rose',
    });
  }

  if (data.criticalStock > 0) {
    operationalAlerts.push({
      title: `${data.criticalStock} produto(s) em estoque crítico`,
      description: 'Revise reposição antes de confirmar pedidos maiores.',
      href: '/dashboard/estoque?stock=CRITICO',
      tone: 'amber',
    });
  }

  if (data.deliveriesWithChangedAddress > 0) {
    operationalAlerts.push({
      title: `${data.deliveriesWithChangedAddress} entrega(s) em endereço diferente`,
      description: 'Confira referências e rotas antes de enviar ao entregador.',
      href: '/dashboard/entregas',
      tone: 'sky',
    });
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950 text-white shadow-xl shadow-slate-300/60">
        <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[1.3fr_0.7fr] lg:p-7">
          <div>
            <p className="text-sm font-semibold text-emerald-300">Página principal</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              Gás Gasparzinho em movimento
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Acompanhe vendas, entregas, estoque e cobranças em um painel mais claro para decidir rápido.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <Link href="/dashboard/vendas" className="rounded-lg border border-white/10 bg-white/10 p-4 transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
              <p className="font-bold uppercase text-slate-100">Vendas hoje</p>
              <p className="mt-1 text-xl font-bold text-white">{currency.format(data.totalSalesToday)}</p>
            </Link>
            <Link href="/dashboard/entregas" className="rounded-lg border border-white/10 bg-emerald-500 p-4 text-white transition hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200">
              <p className="font-bold uppercase text-emerald-50">Entregas</p>
              <p className="mt-1 text-xl font-bold">{data.deliveriesInProgress}</p>
            </Link>
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
          href="/dashboard/vendas"
        />
        <MetricCard
          title="Clientes"
          value={data.activeCustomers}
          description="Cadastros disponíveis para venda e entrega."
          icon={Users}
          tone="blue"
          href="/dashboard/clientes"
        />
        <MetricCard
          title="Dívidas abertas"
          value={data.debtors}
          description="Clientes com cobrança pendente, vencida ou renegociada."
          icon={CreditCard}
          tone="rose"
          href="/dashboard/cobranca"
        />
        <MetricCard
          title="Estoque crítico"
          value={data.criticalStock}
          description="Produtos com menos de 10 unidades."
          icon={Package}
          tone="amber"
          href="/dashboard/estoque?stock=CRITICO"
        />
        <MetricCard
          title="Entregas em andamento"
          value={data.deliveriesInProgress}
          description="Entregas pendentes ou em rota."
          icon={Truck}
          tone="blue"
          href="/dashboard/entregas"
        />
        <MetricCard
          title="Fidelização"
          value={data.loyaltyOpportunities}
          description="Clientes com previsão de nova compra nos últimos ou próximos 3 dias."
          icon={Repeat}
          tone="slate"
          href="/dashboard/fidelizacao"
        />
        <MetricCard
          title="Ticket médio hoje"
          value={currency.format(data.averageTicketToday)}
          description={`${data.salesTodayCount} pedido(s) registrado(s) hoje.`}
          icon={TrendingUp}
          tone="emerald"
          href="/dashboard/vendas"
        />
        <MetricCard
          title="Vendas no mês"
          value={currency.format(data.monthRevenue)}
          description={`${data.monthOrders} pedido(s), despesas de ${currency.format(data.monthExpenses)}.`}
          icon={Banknote}
          tone="blue"
          href="/dashboard/financeiro?period=monthly"
        />
        <MetricCard
          title="A receber"
          value={currency.format(data.openDebtValue)}
          description="Valor aberto em cobranças pendentes, vencidas ou renegociadas."
          icon={CreditCard}
          tone="rose"
          href="/dashboard/cobranca"
        />
      </div>

      {operationalAlerts.length > 0 ? (
        <section className="grid gap-3 lg:grid-cols-3">
          {operationalAlerts.map((alert) => (
            <OperationalAlert key={alert.title} {...alert} />
          ))}
        </section>
      ) : (
        <section className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
          Operação sem alertas críticos no momento.
        </section>
      )}

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Card className="border-slate-300">
          <CardHeader className="border-b border-slate-200 bg-slate-50">
            <CardTitle className="text-xl font-extrabold text-slate-950">Vendas dos últimos 7 dias</CardTitle>
            <CardDescription>Valor bruto por dia, sem pedidos cancelados.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <SalesChart data={data.salesData} />
          </CardContent>
        </Card>

        <Card className="border-slate-300">
          <CardHeader className="border-b border-slate-200 bg-slate-50">
            <CardTitle className="text-xl font-extrabold text-slate-950">Pedidos recentes</CardTitle>
            <CardDescription>Últimas movimentações registradas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-6">
            {data.recentOrders.length > 0 ? (
              data.recentOrders.map((order) => (
                <Link
                  href={`/dashboard/vendas/${order.id}`}
                  key={order.id}
                  className="flex items-start justify-between gap-3 rounded-md border border-slate-300 bg-slate-50 px-3 py-3 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-950">{decodeContactText(order.customer.name)}</p>
                    <p className="text-xs font-medium text-slate-600">
                      {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-extrabold text-slate-950">{currency.format(order.grossValue)}</p>
                    <Badge variant="secondary" className="mt-1">
                      {labelFrom(orderStatusLabels, order.status)}
                    </Badge>
                  </div>
                </Link>
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
