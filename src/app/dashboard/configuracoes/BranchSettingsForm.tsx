'use client';

import { useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateDefaultBranchName } from './actions';

const initialState = { success: false, message: '' };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? 'Salvando...' : 'Salvar filial'}
    </Button>
  );
}

export default function BranchSettingsForm({ defaultValue }: { defaultValue: string }) {
  const [state, action] = useFormState(updateDefaultBranchName, initialState);

  useEffect(() => {
    if (!state.message) return;
    if (state.success) toast.success(state.message);
    else toast.error(state.message);
  }, [state]);

  return (
    <form action={action} className="space-y-3">
      <div className="space-y-2">
        <label htmlFor="defaultBranchName" className="text-sm font-bold text-slate-800">
          Filial padrão
        </label>
        <Input
          id="defaultBranchName"
          name="defaultBranchName"
          defaultValue={defaultValue}
          placeholder="Ex.: Gás Gasparzinho"
          maxLength={80}
        />
        <p className="text-xs font-medium text-slate-500">
          Este nome aparece no cabeçalho e prepara o sistema para a futura gestão multifilial.
        </p>
      </div>
      <SubmitButton />
    </form>
  );
}
