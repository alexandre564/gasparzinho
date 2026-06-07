import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CreditCard,
  Package,
  Repeat,
  TrendingUp,
  Truck,
  Users,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import DateRangeFilter from '@/components/DateRangeFilter';
import SalesChart from '@/components/SalesChart';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { prisma } from '@/lib/prisma';
import { labelFrom, orderStatusLabels } from '@/lib/labels';
import { getLoyaltyPredictions } from './fidelizacao/actions';
import { decodeContactText } from '@/lib/contact-text';
import { buildBranchWhere } from '@/lib/branch-scope';
import { getCashRevenueTotal } from '@/lib/cash-flow';
import { getCurrentBranchScope } from '@/lib/current-branch-scope';

export const dynamic = 'force-dynamic';

const OPEN_DEBT_STATUSES = ['PENDENTE', 'VENCIDO', 'RENEGOCIADO'] as const;
type DashboardPeriod = 'today' | 'week' | 'month' | 'custom';

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

function parseFilterDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function normalizeDashboardPeriod(period?: string, from?: string, to?: string): DashboardPeriod {
  if (period === 'today' || period === 'month' || period === 'custom') {
    return period;
  }

  if (from || to) {
    return 'custom';
  }

  return 'week';
}

function getDashboardRange(period?: string, from?: string, to?: string) {
  const selectedPeriod = normalizeDashboardPeriod(period, from, to);
  const start = parseFilterDate(from);
  const end = parseFilterDate(to);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (selectedPeriod === 'today') {
    return { from: today, to: endOfDay(today), period: selectedPeriod, label: 'Hoje' };
  }

  if (selectedPeriod === 'month') {
    const monthStart = new Date(today);
    monthStart.setDate(1);
    return { from: monthStart, to: endOfDay(today), period: selectedPeriod, label: 'Mes atual' };
  }

  if (selectedPeriod === 'custom' && (start || end)) {
    const rangeStart = start ?? end ?? today;
    const rangeEnd = end ? endOfDay(end) : endOfDay(today);

    return rangeStart <= rangeEnd
      ? { from: rangeStart, to: rangeEnd, period: selectedPeriod, label: 'Personalizado' }
      : { from: startOfDay(rangeEnd), to: endOfDay(rangeStart), period: selectedPeriod, label: 'Personalizado' };
  }

  const defaultStart = new Date(today);
  defaultStart.setDate(defaultStart.getDate() - 6);

  return {
    from: defaultStart,
    to: endOfDay(today),
    period: selectedPeriod === 'custom' ? selectedPeriod : 'week',
    label: selectedPeriod === 'custom' ? 'Personalizado' : 'Semana',
  };
}

function getChartPoints(from: Date, to: Date) {
  const days = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)));

  if (days <= 31) {
    return Array.from({ length: days }).map((_, index) => {
      const start = new Date(from);
      start.setDate(from.getDate() + index);
      start.setHours(0, 0, 0, 0);

      return { start, end: endOfDay(start), name: start.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) };
    });
  }

  const points = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);

  while (cursor <= to && points.length < 24) {
    const start = new Date(cursor);
    const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59, 999);
    points.push({
      start,
      end: end > to ? to : end,
      name: start.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', ''),
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return points;
}

async function getDashboardData(period?: string, from?: string, to?: string) {
  const branchScope = await getCurrentBranchScope();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today);
  monthStart.setDate(1);
  const dashboardRange = getDashboardRange(period, from, to);

  const [
    salesToday,
    salesMonth,
    periodSales,
    periodCashRevenue,
    periodExpenses,
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
    prisma.order.aggregate({
      _sum: { grossValue: true },
      _count: { id: true },
      where: buildBranchWhere(branchScope, {
        createdAt: { gte: dashboardRange.from, lte: dashboardRange.to },
        status: { not: 'CANCELADO' },
      }),
    }),
    getCashRevenueTotal(dashboardRange.from, dashboardRange.to, branchScope),
    prisma.expense.aggregate({
      _sum: { value: true },
      where: buildBranchWhere(branchScope, { date: { gte: dashboardRange.from, lte: dashboardRange.to } }),
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

  const chartPoints = getChartPoints(dashboardRange.from, dashboardRange.to);
  const salesData = await Promise.all(
    chartPoints.map(async ({ start, end, name }) => {
      const [dailySales, dailyCashRevenue] = await Promise.all([
        prisma.order.aggregate({
          _sum: { grossValue: true },
          where: buildBranchWhere(branchScope, {
            createdAt: { gte: start, lte: end },
            status: { not: 'CANCELADO' },
          }),
        }),
        getCashRevenueTotal(start, end, branchScope),
      ]);
      const dailySalesTotal = dailySales._sum.grossValue ?? 0;

      return {
        name,
        total: dailySalesTotal,
        Vendas: dailySalesTotal,
        Entradas: dailyCashRevenue,
      };
    }),
  );

  return {
    totalSalesToday: salesToday._sum.grossValue ?? 0,
    salesTodayCount: salesToday._count.id,
    averageTicketToday:
      salesToday._count.id > 0 ? (salesToday._sum.grossValue ?? 0) / salesToday._count.id : 0,
    monthRevenue: salesMonth._sum.grossValue ?? 0,
    monthProfit: (salesMonth._sum.netValue ?? 0) - (expensesMonth._sum.value ?? 0),
    monthOrders: salesMonth._count.id,
    monthExpenses: expensesMonth._sum.value ?? 0,
    periodSales: periodSales._sum.grossValue ?? 0,
    periodOrders: periodSales._count.id,
    periodCashRevenue,
    periodExpenses: periodExpenses._sum.value ?? 0,
    periodNetCash: periodCashRevenue - (periodExpenses._sum.value ?? 0),
    periodLabel: dashboardRange.label,
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
  emphasis = 'normal',
}: {
  title: string;
  value: string | number;
  description: string;
  icon: ComponentType<{ className?: string }>;
  tone?: 'emerald' | 'blue' | 'amber' | 'rose' | 'slate';
  href?: string;
  emphasis?: 'normal' | 'strong';
}) {
  const toneClass = {
    emerald: {
      accent: 'bg-emerald-500',
      chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
      strong: 'border-emerald-700 bg-slate-950 text-white shadow-slate-300/70',
    },
    blue: {
      accent: 'bg-sky-500',
      chip: 'bg-sky-50 text-sky-700 ring-sky-200',
      strong: 'border-sky-700 bg-slate-950 text-white shadow-slate-300/70',
    },
    amber: {
      accent: 'bg-amber-500',
      chip: 'bg-amber-50 text-amber-700 ring-amber-200',
      strong: 'border-amber-400 bg-amber-50 text-slate-950 shadow-amber-100',
    },
    rose: {
      accent: 'bg-rose-500',
      chip: 'bg-rose-50 text-rose-700 ring-rose-200',
      strong: 'border-rose-300 bg-rose-50 text-slate-950 shadow-rose-100',
    },
    slate: {
      accent: 'bg-slate-500',
      chip: 'bg-slate-100 text-slate-700 ring-slate-300',
      strong: 'border-slate-800 bg-slate-950 text-white shadow-slate-300/70',
    },
  }[tone];

  const isStrong = emphasis === 'strong';
  const card = (
    <Card
      className={`interactive-lift group relative h-full overflow-hidden border shadow-lg ${
        isStrong ? toneClass.strong : 'border-slate-300 bg-white shadow-slate-200/80 hover:border-emerald-300'
      }`}
    >
      <div className={`absolute inset-x-0 top-0 h-1 ${toneClass.accent}`} />
      <CardHeader className={`flex flex-row items-start justify-between space-y-0 border-b pb-3 ${
        isStrong ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50/80'
      }`}
      >
        <CardTitle className={`text-sm font-extrabold uppercase tracking-wide ${
          isStrong && (tone === 'emerald' || tone === 'blue' || tone === 'slate') ? 'text-white' : 'text-slate-950'
        }`}
        >
          {title}
        </CardTitle>
        <div className={`rounded-md p-2 ring-1 ${toneClass.chip}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="pt-5">
        <div
          className={`text-3xl font-black tracking-tight ${
            isStrong && (tone === 'emerald' || tone === 'blue' || tone === 'slate') ? 'text-white' : 'text-slate-950'
          } metric-value`}
        >
          {value}
        </div>
        <p
          className={`mt-2 text-sm font-medium leading-5 ${
            isStrong && (tone === 'emerald' || tone === 'blue' || tone === 'slate') ? 'text-slate-300' : 'text-slate-700'
          }`}
        >
          {description}
        </p>
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
    amber: 'border-amber-300 bg-amber-50 text-amber-950 hover:border-amber-400',
    rose: 'border-rose-300 bg-rose-50 text-rose-950 hover:border-rose-400',
    sky: 'border-sky-300 bg-sky-50 text-sky-950 hover:border-sky-400',
  }[tone];

  const iconClass = {
    amber: 'bg-amber-100 text-amber-700',
    rose: 'bg-rose-100 text-rose-700',
    sky: 'bg-sky-100 text-sky-700',
  }[tone];

  return (
    <Link
      href={href}
      className={`interactive-lift group flex items-start gap-3 rounded-lg border px-4 py-4 text-sm shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${toneClass}`}
    >
      <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${iconClass}`}>
        <AlertTriangle className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <strong className="block text-base">{title}</strong>
        <span className="mt-1 block leading-5 opacity-85">{description}</span>
      </span>
      <span className="mt-1 hidden items-center gap-1 text-xs font-extrabold uppercase tracking-wide opacity-80 group-hover:opacity-100 sm:flex">
        Ver
        <ArrowRight className="h-3.5 w-3.5" />
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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { period?: string; from?: string; to?: string };
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  const data = await getDashboardData(searchParams?.period, searchParams?.from, searchParams?.to);
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
      <section className="motion-safe:animate-soft-slide-up overflow-hidden rounded-xl border border-slate-800 bg-slate-950 text-white shadow-xl shadow-slate-300/60">
        <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1.35fr_0.65fr] lg:p-8">
          <div className="flex min-w-0 flex-col justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-300">Página principal</p>
              <h2 className="mt-3 max-w-3xl text-3xl font-black tracking-tight sm:text-4xl">
                Gasparzinho em operação
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                Vendas, entregas, cobranças e estoque em uma visão executiva para decidir rápido.
              </p>
            </div>
            <div className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
              <div className="interactive-lift rounded-lg border border-white/10 bg-white/[0.06] p-3">
                <p className="text-xs font-bold uppercase text-slate-300">Pedidos hoje</p>
                <p className="mt-1 text-lg font-black text-white">{data.salesTodayCount}</p>
              </div>
              <div className="interactive-lift rounded-lg border border-white/10 bg-white/[0.06] p-3">
                <p className="text-xs font-bold uppercase text-slate-300">Ticket médio</p>
                <p className="mt-1 text-lg font-black text-white">{currency.format(data.averageTicketToday)}</p>
              </div>
              <div className="interactive-lift rounded-lg border border-white/10 bg-white/[0.06] p-3">
                <p className="text-xs font-bold uppercase text-slate-300">Vendas no mês</p>
                <p className="mt-1 text-lg font-black text-white">{currency.format(data.monthRevenue)}</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 text-sm">
            <Link href="/dashboard/vendas" className="interactive-lift rounded-lg border border-white/10 bg-white/10 p-4 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
              <p className="font-bold uppercase text-slate-100">Vendas hoje</p>
              <p className="mt-2 text-2xl font-black text-white">{currency.format(data.totalSalesToday)}</p>
            </Link>
            <Link href="/dashboard/entregas" className="interactive-lift rounded-lg border border-emerald-300/20 bg-emerald-500 p-4 text-white hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200">
              <p className="font-bold uppercase text-emerald-50">Entregas em andamento</p>
              <p className="mt-2 text-2xl font-black">{data.deliveriesInProgress}</p>
            </Link>
          </div>
        </div>
      </section>

      <Card className="border-slate-300 bg-white shadow-sm">
        <CardContent className="grid gap-4 pt-5 lg:grid-cols-[auto_1fr] lg:items-start">
          <DateRangeFilter />
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-extrabold uppercase text-slate-600">{data.periodLabel}</p>
              <p className="mt-1 text-xl font-black text-slate-950">{currency.format(data.periodSales)}</p>
              <p className="text-xs text-slate-600">{data.periodOrders} pedido(s) no periodo.</p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-xs font-extrabold uppercase text-emerald-700">Entradas em caixa</p>
              <p className="mt-1 text-xl font-black text-emerald-800">{currency.format(data.periodCashRevenue)}</p>
              <p className="text-xs text-emerald-700">Vendas pagas e recebimentos de fiado.</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-extrabold uppercase text-slate-600">Saldo do periodo</p>
              <p className={`mt-1 text-xl font-black ${data.periodNetCash >= 0 ? 'text-emerald-800' : 'text-red-700'}`}>
                {currency.format(data.periodNetCash)}
              </p>
              <p className="text-xs text-slate-600">Entradas menos despesas filtradas.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          title="Vendas hoje"
          value={currency.format(data.totalSalesToday)}
          description="Total bruto vendido desde o início do dia."
          icon={Banknote}
          tone="emerald"
          href="/dashboard/vendas"
          emphasis="strong"
        />
        <MetricCard
          title="Entregas"
          value={data.deliveriesInProgress}
          description="Entregas pendentes ou em rota."
          icon={Truck}
          tone="blue"
          href="/dashboard/entregas"
          emphasis="strong"
        />
        <MetricCard
          title="A receber"
          value={currency.format(data.openDebtValue)}
          description="Valor aberto em cobranças pendentes, vencidas ou renegociadas."
          icon={CreditCard}
          tone="rose"
          href="/dashboard/cobranca"
          emphasis="strong"
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
      </div>

      {operationalAlerts.length > 0 ? (
        <section className="grid gap-3 lg:grid-cols-3">
          {operationalAlerts.map((alert) => (
            <OperationalAlert key={alert.title} {...alert} />
          ))}
        </section>
      ) : (
        <section className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 shadow-sm">
          Operação sem alertas críticos no momento.
        </section>
      )}

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Card className="overflow-hidden border-slate-300">
          <CardHeader className="border-b border-slate-200 bg-white">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <CardTitle className="text-xl font-black text-slate-950">Vendas e entradas no periodo</CardTitle>
                <CardDescription>Vendas registradas e dinheiro efetivamente recebido em caixa.</CardDescription>
              </div>
              <Badge variant="secondary" className="w-fit border border-slate-300 bg-slate-100 text-slate-700">
                {data.periodLabel}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <SalesChart data={data.salesData} />
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-slate-300">
          <CardHeader className="border-b border-slate-200 bg-white">
            <CardTitle className="text-xl font-black text-slate-950">Pedidos recentes</CardTitle>
            <CardDescription>Últimas movimentações registradas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-6">
            {data.recentOrders.length > 0 ? (
              data.recentOrders.map((order) => (
                <Link
                  href={`/dashboard/vendas/${order.id}`}
                  key={order.id}
                  className="interactive-lift flex items-start justify-between gap-3 rounded-lg border border-slate-300 bg-slate-50 px-3 py-3 shadow-sm hover:border-emerald-300 hover:bg-emerald-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold text-slate-950">{decodeContactText(order.customer.name)}</p>
                    <p className="text-xs font-medium text-slate-600">
                      {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-black text-slate-950">{currency.format(order.grossValue)}</p>
                    <Badge variant="secondary" className="mt-1 border border-slate-300 bg-white">
                      {labelFrom(orderStatusLabels, order.status)}
                    </Badge>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600">
                Nenhum pedido registrado ainda.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
