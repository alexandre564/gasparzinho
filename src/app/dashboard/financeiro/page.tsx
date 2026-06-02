import { Suspense } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  Download,
  DollarSign,
  Landmark,
  Loader2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Expense } from '@prisma/client';

import { getTotalOpenDebt } from './actions';
import { getFinancialSummary, getPaginatedExpenses, getWeeklyChartData, type FinancialPeriod } from './despesas/actions';
import { expenseLabel } from './despesas/categories';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import SalesChart from '@/components/SalesChart';
import { MetricTile, PageHeader, SectionCard } from '@/components/PageShell';
import { PeriodToggle } from '../relatorios/PeriodToggle';
import { requirePageAccess } from '@/lib/page-auth';

export const dynamic = 'force-dynamic';

const currencyFormatter = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

function getPeriod(searchPeriod?: string): FinancialPeriod {
  if (searchPeriod === 'daily' || searchPeriod === 'weekly' || searchPeriod === 'monthly' || searchPeriod === 'yearly') {
    return searchPeriod;
  }

  return 'monthly';
}

const periodTitle: Record<FinancialPeriod, string> = {
  daily: 'do dia',
  weekly: 'da semana',
  monthly: 'do mês',
  yearly: 'do ano',
};

function StatCard({
  title,
  value,
  icon,
  subtext,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  subtext?: string;
}) {
  const tone = title.includes('Gastos') || title.includes('Dívidas') ? 'rose' : title.includes('Saldo') ? 'blue' : 'emerald';

  return (
    <MetricTile
      title={title}
      value={value}
      description={subtext}
      icon={() => <span className="contents">{icon}</span>}
      tone={tone}
    />
  );
}

async function FinancialSummary({ period }: { period: FinancialPeriod }) {
  const [summary, debtSummary] = await Promise.all([
    getFinancialSummary(period),
    getTotalOpenDebt(),
  ]);

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatCard
        title={`Receita ${periodTitle[period]}`}
        value={currencyFormatter(summary.current.revenue)}
        icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
        subtext={`Hoje: ${currencyFormatter(summary.today.revenue)}`}
      />
      <StatCard
        title={`Gastos ${periodTitle[period]}`}
        value={currencyFormatter(summary.current.expenses)}
        icon={<TrendingDown className="h-4 w-4 text-muted-foreground" />}
        subtext={`Hoje: ${currencyFormatter(summary.today.expenses)}`}
      />
      <StatCard
        title={`Saldo ${periodTitle[period]}`}
        value={currencyFormatter(summary.current.net)}
        icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
        subtext={`Hoje: ${currencyFormatter(summary.today.net)}`}
      />
      <StatCard
        title="Dívidas abertas"
        value={currencyFormatter(debtSummary.totalOpen)}
        icon={<AlertCircle className="h-4 w-4 text-muted-foreground" />}
        subtext="Cobranças pendentes ou renegociadas"
      />
    </div>
  );
}

async function RecentExpenses() {
  const { expenses } = await getPaginatedExpenses('', 1);

  return (
    <SectionCard title="Despesas recentes" description="Últimas despesas adicionadas ao fluxo financeiro.">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="hidden text-center md:table-cell">Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.slice(0, 5).map((expense: Expense) => (
              <TableRow key={expense.id}>
                <TableCell>
                  <div className="font-medium text-slate-950">{expense.description}</div>
                  <div className="text-xs text-slate-500">{expenseLabel(expense.category)}</div>
                </TableCell>
                <TableCell className="text-right font-mono">
                  {currencyFormatter(expense.value)}
                </TableCell>
                <TableCell className="hidden text-center md:table-cell">
                  {new Date(expense.date).toLocaleDateString('pt-BR')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
    </SectionCard>
  );
}

async function WeeklyChart({ period }: { period: FinancialPeriod }) {
  const chartData = await getWeeklyChartData(period);

  return (
    <SectionCard title="Fluxo financeiro" description="Receitas e gastos no período selecionado.">
        <SalesChart data={chartData} />
    </SectionCard>
  );
}

export default async function FinancialPage({ searchParams }: { searchParams?: { period?: string } }) {
  await requirePageAccess(['ADMIN']);

  const period = getPeriod(searchParams?.period);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Financeiro"
        title="Painel financeiro"
        description="Acompanhe entradas, gastos, saldo e dívidas por período com a mesma leitura operacional do dashboard."
        icon={Landmark}
        actions={
          <>
          <Button asChild variant="outline">
            <a href={`/api/financeiro/exportar?period=${period}`} download>
              <Download className="mr-2 h-4 w-4" />
              Exportar resumo
            </a>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/gastos">
              Gerenciar gastos
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/financeiro/dividas">
              Ver dívidas
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <PeriodToggle period={period} basePath="/dashboard/financeiro" />
          </>
        }
      />

      <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin" />}>
        <FinancialSummary period={period} />
      </Suspense>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin" />}>
          <WeeklyChart period={period} />
        </Suspense>
        <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin" />}>
          <RecentExpenses />
        </Suspense>
      </div>
    </div>
  );
}
