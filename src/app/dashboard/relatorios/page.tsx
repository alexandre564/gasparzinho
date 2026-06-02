import { BarChart3, DollarSign, Download, Receipt, TrendingDown } from 'lucide-react';

import SalesChart from '@/components/SalesChart';
import { MetricTile, PageHeader, SectionCard } from '@/components/PageShell';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getSalesReportData, type ReportPeriod } from './actions';
import { PeriodToggle } from './PeriodToggle';
import { requirePageAccess } from '@/lib/page-auth';


export const dynamic = 'force-dynamic';
const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

function getPeriod(searchPeriod?: string): ReportPeriod {
  if (searchPeriod === 'daily' || searchPeriod === 'weekly' || searchPeriod === 'monthly' || searchPeriod === 'yearly') {
    return searchPeriod;
  }

  return 'daily';
}

const periodLabels: Record<ReportPeriod, string> = {
  daily: 'Dias',
  weekly: 'Semanas',
  monthly: 'Meses',
  yearly: 'Anos',
};

const periodDescriptions: Record<ReportPeriod, string> = {
  daily: 'Comparativo dos últimos 7 dias.',
  weekly: 'Comparativo das últimas 8 semanas.',
  monthly: 'Comparativo dos últimos 6 meses.',
  yearly: 'Comparativo dos últimos 5 anos.',
};

function SummaryCard({
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
    <MetricTile
      title={title}
      value={value}
      description={description}
      icon={Icon}
      tone={title === 'Despesas' ? 'rose' : title === 'Saldo' ? 'blue' : 'emerald'}
    />
  );
}

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams?: { period?: string };
}) {
  await requirePageAccess(['ADMIN']);

  const period = getPeriod(searchParams?.period);
  const salesData = await getSalesReportData(period);
  const total = salesData.reduce((sum, item) => sum + item.total, 0);
  const totalExpenses = salesData.reduce((sum, item) => sum + item.expenses, 0);
  const net = total - totalExpenses;
  const ordersCount = salesData.reduce((sum, item) => sum + item.ordersCount, 0);
  const averageTicket = ordersCount > 0 ? total / ordersCount : 0;
  const bestPoint = salesData.reduce(
    (best, item) => (item.net > best.net ? item : best),
    { name: '-', total: 0, expenses: 0, net: 0, ordersCount: 0, avgTicket: 0 },
  );
  const chartData = salesData.map((item) => ({
    name: item.name,
    Entradas: item.total,
    Saidas: item.expenses,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Análise"
        title="Relatórios"
        description="Analise vendas, gastos, saldo e ticket médio por dia, semana, mês ou ano."
        icon={BarChart3}
        actions={
          <>
          <Button asChild variant="outline" size="sm">
            <a href={`/api/relatorios/exportar?period=${period}`} download>
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </a>
          </Button>
          <PeriodToggle period={period} />
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Entradas"
          value={currency.format(total)}
          description="Soma bruta das vendas no período selecionado."
          icon={DollarSign}
        />
        <SummaryCard
          title="Despesas"
          value={currency.format(totalExpenses)}
          description="Soma das despesas no mesmo período."
          icon={TrendingDown}
        />
        <SummaryCard
          title="Saldo"
          value={currency.format(net)}
          description="Entradas menos despesas."
          icon={BarChart3}
        />
        <SummaryCard
          title="Ticket médio"
          value={currency.format(averageTicket)}
          description={`${ordersCount} pedido(s) no período.`}
          icon={Receipt}
        />
      </div>

      <SectionCard title="Vendas por período" description={periodDescriptions[period]}>
          <SalesChart data={chartData} labelPrefix={periodLabels[period]} />
      </SectionCard>

      <SectionCard
        title="Detalhamento do período"
        description={`Melhor saldo: ${bestPoint.name} com ${currency.format(bestPoint.net)}.`}
      >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{periodLabels[period]}</TableHead>
                <TableHead className="text-right">Entradas</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Despesas</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead className="hidden text-center md:table-cell">Pedidos</TableHead>
                <TableHead className="hidden text-right lg:table-cell">Ticket médio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salesData.map((item) => (
                <TableRow key={item.name}>
                  <TableCell className="font-semibold">{item.name}</TableCell>
                  <TableCell className="text-right font-mono">{currency.format(item.total)}</TableCell>
                  <TableCell className="hidden text-right font-mono text-red-700 sm:table-cell">
                    {currency.format(item.expenses)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold text-emerald-700">
                    {currency.format(item.net)}
                  </TableCell>
                  <TableCell className="hidden text-center md:table-cell">{item.ordersCount}</TableCell>
                  <TableCell className="hidden text-right font-mono lg:table-cell">
                    {currency.format(item.avgTicket)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
      </SectionCard>
    </div>
  );
}
