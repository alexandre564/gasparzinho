'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { createDailyClosing } from './actions';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';

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
} from "@/components/ui/alert-dialog"

import { Lock, Printer, Share2, Loader2 } from 'lucide-react';

interface SummaryData {
    totalRevenue: number;
    totalExpenses: number;
    netBalance: number;
    ordersCount: number;
}

interface Sale { /* ... defina os campos de sale ... */ }
interface StockItem { name: string; units: number; }

interface ClientData {
    summary: SummaryData;
    sales: Sale[];
    stockForecast: StockItem[];
}

interface Props {
    data: ClientData;
    isAlreadyClosed: boolean;
}

export default function ClosingActions({ data, isAlreadyClosed }: Props) {
    const [isPending, startTransition] = useTransition();

    const handlePrint = () => {
        window.print();
    }

    const handleShareWhatsApp = () => {
        const { totalRevenue, totalExpenses, netBalance } = data.summary;
        const today = format(new Date(), 'dd/MM/yyyy');

        const message = `*Resumo do Dia - ${today}*

- *Entradas:* ${formatCurrency(totalRevenue)}
- *Despesas:* ${formatCurrency(totalExpenses)}
- *Saldo Líquido:* ${formatCurrency(netBalance)}

(Mensagem gerada automaticamente pelo sistema)`;

        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    }

    const handleCloseDay = () => {
        startTransition(async () => {
            const result = await createDailyClosing({
                date: new Date(),
                totalRevenue: data.summary.totalRevenue,
                totalExpenses: data.summary.totalExpenses,
                netBalance: data.summary.netBalance,
                ordersCount: data.summary.ordersCount,
                stockForecast: JSON.stringify(data.stockForecast)
            });

            if (result.success) {
                toast.success(result.message);
            } else {
                toast.error(result.message);
            }
        });
    }

    return (
        <div className="flex flex-col sm:flex-row gap-2 print-hidden">
            <AlertDialog>
                <AlertDialogTrigger asChild>
                     <Button 
                        disabled={isAlreadyClosed || isPending}
                        className="w-full sm:w-auto"
                    >
                        {isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <Lock className="h-4 w-4 mr-2"/>}
                        {isAlreadyClosed ? 'Fechamento Já Realizado' : 'Fechar o Dia'}
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Fechamento do Dia</AlertDialogTitle>
                        <AlertDialogDescription>
                            Você tem certeza que deseja fechar o dia? Esta ação salvará um resumo permanente das finanças de hoje e não poderá ser desfeita.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCloseDay}>Confirmar Fechamento</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Button variant="outline" onClick={handlePrint} className="w-full sm:w-auto">
                <Printer className="h-4 w-4 mr-2"/>
                Baixar PDF
            </Button>
            <Button variant="outline" onClick={handleShareWhatsApp} className="w-full sm:w-auto">
                <Share2 className="h-4 w-4 mr-2"/>
                Compartilhar
            </Button>
        </div>
    );
}
