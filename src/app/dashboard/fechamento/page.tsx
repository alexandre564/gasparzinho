import { Suspense } from 'react';
import { CalendarCheck, Download, Loader2 } from 'lucide-react';

import { getClosingHistory, getDailyClosingData } from './actions';
import ClosingActions from './ClosingActions';
import ClosingHistory from './ClosingHistory';
import ClosingSummary from './ClosingSummary';
import DateRangeFilter from './DateRangeFilter';
import { PageHeader, SectionCard } from '@/components/PageShell';
import { Button } from '@/components/ui/button';
import { requirePageAccess } from '@/lib/page-auth';


export const dynamic = 'force-dynamic';
export default async function FechamentoPage({
  searchParams,
}: {
  searchParams?: { from?: string; to?: string };
}) {
  await requirePageAccess(['ADMIN']);

  const closingData = await getDailyClosingData();
  const history = await getClosingHistory(searchParams?.from, searchParams?.to);
  const { sales, expenses, stockForecast, isAlreadyClosed, ...summaryData } = closingData;
  const exportParams = new URLSearchParams();

  if (searchParams?.from) exportParams.set('from', searchParams.from);
  if (searchParams?.to) exportParams.set('to', searchParams.to);

  const exportHref = `/api/fechamento/exportar${exportParams.toString() ? `?${exportParams.toString()}` : ''}`;
  const clientData = {
    summary: summaryData,
    sales,
    expenses,
    stockForecast,
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Caixa e operação"
        title="Fechamento do dia"
        description="Confira entradas, despesas, saldo, estoque e histórico antes de salvar o caixa do dia."
        icon={CalendarCheck}
        actions={
          <>
            <ClosingActions data={clientData} isAlreadyClosed={isAlreadyClosed} />
            <Button asChild variant="outline" size="sm" className="gap-2">
              <a href={exportHref} download>
                <Download className="h-4 w-4" />
                Exportar histórico
              </a>
            </Button>
          </>
        }
      />

      <div id="closing-content" className="space-y-6">
        <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin" />}>
          <ClosingSummary data={{ ...summaryData, sales, expenses, stockForecast }} />
        </Suspense>
      </div>

      <SectionCard
        title="Histórico de fechamentos"
        description="Filtre o período e acompanhe fechamentos anteriores com a mesma leitura do painel financeiro."
      >
        <DateRangeFilter />
        <div className="mt-5">
          <Suspense fallback={<p className="text-sm text-slate-600">Carregando histórico...</p>}>
            <ClosingHistory history={history} />
          </Suspense>
        </div>
      </SectionCard>
    </div>
  );
}
