'use client';

import { deleteUser } from './actions';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

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

interface DeleteUserButtonProps {
  userId: string;
}

export function DeleteUserButton({ userId }: DeleteUserButtonProps) {
  const handleDelete = async () => {
    const formData = new FormData();
    formData.append('id', userId);
    const result = await deleteUser(formData);

    if (result?.success) {
      toast.success(result.message);
    } else {
      toast.error(result?.message || 'Não foi possível excluir o usuário.');
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 gap-2 border-red-200 text-red-700 hover:border-red-300 hover:bg-red-50"
          aria-label="Excluir membro"
          title="Excluir membro"
        >
          <Trash2 className="h-4 w-4" />
          Excluir
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir membro da equipe?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação remove o acesso deste usuário ao sistema. Use apenas quando o membro não
            precisar mais entrar no Gasparzinho.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-600 text-white hover:bg-red-700"
            onClick={handleDelete}
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
