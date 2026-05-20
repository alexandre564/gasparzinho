'use client';

import { useTransition } from 'react';
import { updateUserstring } from './actions';
import { toast } from 'sonner';

interface AccessLevelSelectProps {
  userId: string;
  currentLevel: string;
}

export function AccessLevelSelect({ userId, currentLevel }: AccessLevelSelectProps) {
  let [isPending, startTransition] = useTransition();

  const onLevelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newstring = e.target.value as string;
    startTransition(async () => {
      const result = await updateUserstring(userId, newstring);
      if (result.success) {
        toast.success(`Nível de acesso atualizado para ${newstring}`);
      } else {
        toast.error(result.message);
      }
    });
  };

  return (
    <select
      value={currentLevel}
      onChange={onLevelChange}
      disabled={isPending}
      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
    >
      {["ADMIN","GERENTE","VENDEDOR","OPERADOR"].map((level) => (
        <option key={level} value={level}>
          {level}
        </option>
      ))}
    </select>
  );
}
