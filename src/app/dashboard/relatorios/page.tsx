import { BarChart3, DollarSign, ShoppingCart } from 'lucide-react';

import SalesChart from '@/components/SalesChart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getSalesReportData, type ReportPeriod } from './actions';
import { PeriodToggle } from './PeriodToggle';


export const dynamic = 'force-dynamic';
const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

function getPeriod(searchPeriod?: string): ReportPeriod {
  return searchPeriod === 'monthly' ? 'monthly' : 'daily';
}

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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-600">{title}</CardTitle>
        <Icon className="h-4 w-4 text-slate-500" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight text-slate-950">{value}</div>
        <p className="mt-1 text-xs text-slate-600">{description}</p>
      </CardContent>
    </Card>
  );
}

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams?: { period?: string };
}) {
  const period = getPeriod(searchParams?.period);
  const salesData = await getSalesReportData(period);
  const total = salesData.reduce((sum, item) => sum + item.total, 0);
  const average = salesData.length ? total / salesData.length : 0;
  const bestPoint = salesData.reduce(
    (best, item) => (item.total > best.total ? item : best),
    { name: '-', total: 0 },
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Relatorios</h2>
          <p className="text-sm text-slate-600">
            Analise as vendas por dia ou por mes, sem pedidos cancelados.
          </p>
        </div>
        <PeriodToggle period={period} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          title={period === 'monthly' ? 'Total em 6 meses' : 'Total em 7 dias'}
          value={currency.format(total)}
          description="Soma bruta das vendas no periodo selecionado."
          icon={DollarSign}
        />
        <SummaryCard
          title="Media"
          value={currency.format(average)}
          description={period === 'monthly' ? 'Media mensal do periodo.' : 'Media diaria do periodo.'}
          icon={BarChart3}
        />
        <SummaryCard
          title="Melhor resultado"
          value={bestPoint.name}
          description={currency.format(bestPoint.total)}
          icon={ShoppingCart}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{period === 'monthly' ? 'Vendas mensais' : 'Vendas diarias'}</CardTitle>
          <CardDescription>
            {period === 'monthly'
              ? 'Comparativo dos ultimos 6 meses.'
              : 'Comparativo dos ultimos 7 dias.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SalesChart data={salesData} labelPrefix={period === 'monthly' ? 'Mes' : 'Dia'} />
        </CardContent>
      </Card>
    </div>
  );
}
