import { Suspense } from 'react';
import { getDailyClosingData, getClosingHistory } from './actions';
import ClosingActions from './ClosingActions';
import ClosingSummary from './ClosingSummary';
import ClosingHistory from './ClosingHistory';
import { Loader2 } from 'lucide-react';

export default async function FechamentoPage() {
    const closingData = await getDailyClosingData();
    const history = await getClosingHistory();

    const { sales, stockForecast, ...summaryData } = closingData;

    // Dados para os componentes de cliente
    const clientData = {
        summary: summaryData,
        sales,
        stockForecast: JSON.parse(stockForecast) // Passar o objeto JS, não a string
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold">Fechamento do Dia</h1>
                <p className="text-muted-foreground">Resumo das atividades do dia e ações de fechamento.</p>
            </div>

            <div id="closing-content" className="space-y-6"> 
                <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin"/>}>
                    <ClosingSummary data={summaryData as any} />
                </Suspense>

                <Suspense fallback={<p>Carregando vendas...</p>}>
                    {/* A lista de vendas será renderizada dentro do ClosingSummary ou um componente específico se necessário */}
                </Suspense>
            </div>

            <ClosingActions data={clientData} isAlreadyClosed={closingData.isAlreadyClosed} />

            <Suspense fallback={<p>Carregando histórico...</p>}>
                <ClosingHistory history={history} />
            </Suspense>
        </div>
    );
}
