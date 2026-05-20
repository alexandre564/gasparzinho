'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

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
import { DollarSign, Loader2 } from 'lucide-react';

export default function MarkAsPaidButton({ id }: { id: string }) {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const handlePayment = async () => {
    try {
      setIsPending(true);

      const response = await fetch('/api/financeiro/dividas/marcar-paga', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message || 'Falha ao atualizar a dívida.');
      }
    } catch {
      toast.error('Falha ao atualizar a dívida.');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-green-500 hover:text-green-600">
          <DollarSign className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar pagamento?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação marcará a dívida como paga. A operação não pode ser desfeita facilmente.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handlePayment}
            disabled={isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              'Sim, marcar como paga'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}