import { Suspense } from 'react';
import { Download, Loader2 } from 'lucide-react';

import { getClosingHistory, getDailyClosingData } from './actions';
import ClosingActions from './ClosingActions';
import ClosingHistory from './ClosingHistory';
import ClosingSummary from './ClosingSummary';
import { Button } from '@/components/ui/button';


export const dynamic = 'force-dynamic';
export default async function FechamentoPage() {
  const closingData = await getDailyClosingData();
  const history = await getClosingHistory();
  const { sales, stockForecast, isAlreadyClosed, ...summaryData } = closingData;
  const clientData = {
    summary: summaryData,
    sales,
    stockForecast,
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Fechamento do dia</h1>
          <p className="text-sm text-slate-600">
            Confira vendas, despesas, saldo e estoque antes de fechar o caixa.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href="/api/fechamento/exportar" download>
            <Download className="mr-2 h-4 w-4" />
            Exportar histórico
          </a>
        </Button>
      </div>

      <div id="closing-content" className="space-y-6">
        <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin" />}>
          <ClosingSummary data={{ ...summaryData, sales, stockForecast }} />
        </Suspense>
      </div>

      <ClosingActions data={clientData} isAlreadyClosed={isAlreadyClosed} />

      <Suspense fallback={<p>Carregando histórico...</p>}>
        <ClosingHistory history={history} />
      </Suspense>
    </div>
  );
}
