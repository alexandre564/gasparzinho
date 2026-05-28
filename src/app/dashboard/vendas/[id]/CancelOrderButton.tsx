'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { cancelOrder } from '../actions';

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
import { XCircle, Loader2 } from 'lucide-react';

export default function CancelOrderButton({ orderId }: { orderId: string }) {
    const [isPending, setIsPending] = useState(false);

    const handleCancel = async () => {
        setIsPending(true);
        const result = await cancelOrder(orderId);
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
        <Button variant="destructive">
            <XCircle className="mr-2 h-4 w-4" /> Cancelar Pedido
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Tem certeza que deseja cancelar?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não pode ser desfeita. O estoque será restaurado e a venda será marcada como cancelada.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Voltar</AlertDialogCancel>
          <AlertDialogAction onClick={handleCancel} disabled={isPending} className='bg-destructive hover:bg-destructive/90'>
            {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Cancelando...</> : 'Sim, cancelar pedido'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
