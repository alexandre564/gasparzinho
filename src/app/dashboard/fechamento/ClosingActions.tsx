'use client';

import { useTransition } from 'react';
import { format } from 'date-fns';
import { Loader2, Lock, Printer, Share2 } from 'lucide-react';
import { toast } from 'sonner';

import { createDailyClosing } from './actions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import type { ClosingSale, StockForecastItem } from './actions';

interface SummaryData {
  totalRevenue: number;
  totalExpenses: number;
  netBalance: number;
  ordersCount: number;
}

interface ClientData {
  summary: SummaryData;
  sales: ClosingSale[];
  stockForecast: StockForecastItem[];
}

interface Props {
  data: ClientData;
  isAlreadyClosed: boolean;
}

export default function ClosingActions({ data, isAlreadyClosed }: Props) {
  const [isPending, startTransition] = useTransition();

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const { totalRevenue, totalExpenses, netBalance, ordersCount } = data.summary;
    const today = format(new Date(), 'dd/MM/yyyy');
    const stockText = data.stockForecast
      .map((item) => `- ${item.name}: ${item.units}`)
      .join('\n');

    const message = `*Fechamento Gas Gasparzinho - ${today}*

*Vendas:* ${ordersCount}
*Entradas:* ${formatCurrency(totalRevenue)}
*Despesas:* ${formatCurrency(totalExpenses)}
*Saldo:* ${formatCurrency(netBalance)}

*Estoque:*
${stockText || '- Sem produtos cadastrados'}

Mensagem gerada automaticamente pelo sistema.`;

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleCloseDay = () => {
    startTransition(async () => {
      const result = await createDailyClosing({
        date: new Date(),
        totalRevenue: data.summary.totalRevenue,
        totalExpenses: data.summary.totalExpenses,
        netBalance: data.summary.netBalance,
        ordersCount: data.summary.ordersCount,
        stockForecast: JSON.stringify(data.stockForecast),
      });

      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <div className="flex flex-col gap-2 print-hidden sm:flex-row">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button disabled={isAlreadyClosed || isPending} className="w-full sm:w-auto">
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Lock className="mr-2 h-4 w-4" />
            )}
            {isAlreadyClosed ? 'Fechamento ja realizado' : 'Fechar o dia'}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar fechamento do dia</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao salva um resumo permanente das financas de hoje. Confira os
              valores antes de confirmar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCloseDay}>Confirmar fechamento</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Button variant="outline" onClick={handlePrint} className="w-full sm:w-auto">
        <Printer className="mr-2 h-4 w-4" />
        Baixar PDF
      </Button>
      <Button variant="outline" onClick={handleShareWhatsApp} className="w-full sm:w-auto">
        <Share2 className="mr-2 h-4 w-4" />
        Compartilhar
      </Button>
    </div>
  );
}
