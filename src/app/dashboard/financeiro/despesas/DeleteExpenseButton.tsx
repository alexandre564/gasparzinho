'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { deleteExpense } from './actions';

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
import { Trash2, Loader2 } from 'lucide-react';

export default function DeleteExpenseButton({ id }: { id: string }) {
    const [isPending, setIsPending] = useState(false);

    const handleDelete = async () => {
        setIsPending(true);
        const result = await deleteExpense(id);
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
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive/80"
          aria-label="Excluir despesa"
          title="Excluir despesa"
        >
           <Trash2 className="h-4 w-4"/>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar exclusão?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação irá excluir a despesa permanentemente. A operação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isPending} className='bg-destructive hover:bg-destructive/80'>
             {isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Excluindo...</> : 'Sim, excluir'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
