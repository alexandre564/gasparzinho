'use client';

import { useTransition } from 'react';
import { toast } from 'sonner';

import { updateUserRole } from './actions';
import { TEAM_ROLES } from './roles';

interface AccessLevelSelectProps {
  userId: string;
  currentLevel: string;
}

export function AccessLevelSelect({ userId, currentLevel }: AccessLevelSelectProps) {
  const [isPending, startTransition] = useTransition();

  const onLevelChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = event.target.value;

    startTransition(async () => {
      const result = await updateUserRole(userId, newRole);

      if (result.success) {
        toast.success('N?vel de acesso atualizado.');
        return;
      }

      toast.error(result.message);
    });
  };

  return (
    <select
      value={currentLevel}
      onChange={onLevelChange}
      disabled={isPending}
      className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-950 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
    >
      {TEAM_ROLES.map((role) => (
        <option key={role.value} value={role.value}>
          {role.label}
        </option>
      ))}
    </select>
  );
}
