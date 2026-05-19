'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { markDebtAsPaid } from './actions';

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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DollarSign, Loader2 } from 'lucide-react';

export default function MarkAsPaidButton({ id }: { id: string }) {
    const [isPending, setIsPending] = useState(false);

    const handlePayment = async () => {
        setIsPending(true);
        const result = await markDebtAsPaid(id);
        if (result.success) {
            toast.success(result.message);
        } else {
            toast.error(result.message);
        }
        setIsPending(false);
    };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-green-500 hover:text-green-600">
           <DollarSign className="h-4 w-4"/>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar Pagamento?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação marcará a dívida como paga. A operação não pode ser desfeita facilmente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handlePayment} disabled={isPending} className='bg-green-600 hover:bg-green-700'>
             {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Processando...</> : 'Sim, Marcar como Paga'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
