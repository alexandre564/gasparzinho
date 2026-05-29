import { Suspense } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  Download,
  DollarSign,
  Loader2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Expense } from '@prisma/client';

import { getTotalOpenDebt } from './actions';
import { getFinancialSummary, getPaginatedExpenses, getWeeklyChartData, type FinancialPeriod } from './despesas/actions';
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
import { PeriodToggle } from '../relatorios/PeriodToggle';

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
  monthly: 'do mes',
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
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
      </CardContent>
    </Card>
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
    <Card>
      <CardHeader>
        <CardTitle>Despesas recentes</CardTitle>
        <CardDescription>Últimas despesas adicionadas.</CardDescription>
      </CardHeader>
      <CardContent>
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
                <TableCell>{expense.description}</TableCell>
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
      </CardContent>
    </Card>
  );
}

async function WeeklyChart({ period }: { period: FinancialPeriod }) {
  const chartData = await getWeeklyChartData(period);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fluxo financeiro</CardTitle>
        <CardDescription>Receitas e gastos no periodo selecionado.</CardDescription>
      </CardHeader>
      <CardContent>
        <SalesChart data={chartData} />
      </CardContent>
    </Card>
  );
}

export default function FinancialPage({ searchParams }: { searchParams?: { period?: string } }) {
  const period = getPeriod(searchParams?.period);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">Painel financeiro</h1>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild variant="outline">
            <a href="/api/financeiro/exportar" download>
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
        </div>
      </div>

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
