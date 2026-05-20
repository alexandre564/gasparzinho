'use client';

import { deleteUser } from './actions';
import { toast } from 'sonner';

interface DeleteUserButtonProps {
  userId: string;
}

export function DeleteUserButton({ userId }: DeleteUserButtonProps) {
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (window.confirm('Tem certeza que deseja excluir este usuário?')) {
      const formData = new FormData();
      formData.append('id', userId);
      const result = await deleteUser(formData);

      if (result?.message) {
        toast.success(result.message);
      } else {
        // Assumindo que um erro resultaria em uma exceção capturada na action
        // e a mensagem viria no `catch` da action
        toast.error('Não foi possível excluir o usuário.');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'inline' }}>
      <input type="hidden" name="id" value={userId} />
      <button type="submit" className="text-red-600 hover:text-red-800">
        Excluir
      </button>
    </form>
  );
}
