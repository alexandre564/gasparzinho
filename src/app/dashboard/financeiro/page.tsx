import { Suspense } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Download,
  DollarSign,
  Loader2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Expense } from '@prisma/client';

import { getFinancialSummary, getPaginatedExpenses, getWeeklyChartData } from './despesas/actions';
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


export const dynamic = 'force-dynamic';
const currencyFormatter = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

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

async function FinancialSummary() {
  const summary = await getFinancialSummary();

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <StatCard
        title="Receita do mês"
        value={currencyFormatter(summary.month.revenue)}
        icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
        subtext={`Hoje: ${currencyFormatter(summary.today.revenue)}`}
      />
      <StatCard
        title="Despesas do mês"
        value={currencyFormatter(summary.month.expenses)}
        icon={<TrendingDown className="h-4 w-4 text-muted-foreground" />}
        subtext={`Hoje: ${currencyFormatter(summary.today.expenses)}`}
      />
      <StatCard
        title="Saldo do mês"
        value={currencyFormatter(summary.month.net)}
        icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
        subtext={`Hoje: ${currencyFormatter(summary.today.net)}`}
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

async function WeeklyChart() {
  const chartData = await getWeeklyChartData();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Balanço semanal</CardTitle>
        <CardDescription>Receitas e despesas dos últimos 7 dias.</CardDescription>
      </CardHeader>
      <CardContent>
        <SalesChart data={chartData} />
      </CardContent>
    </Card>
  );
}

export default function FinancialPage() {
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
            <Link href="/dashboard/financeiro/despesas">
              Gerenciar despesas
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin" />}>
        <FinancialSummary />
      </Suspense>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin" />}>
          <WeeklyChart />
        </Suspense>
        <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin" />}>
          <RecentExpenses />
        </Suspense>
      </div>
    </div>
  );
}
