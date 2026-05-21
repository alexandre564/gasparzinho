'use client';

import { useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { updateCollectionMessageTemplate } from './actions';

const initialState = { success: false, message: '' };

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending}>{pending ? 'Salvando...' : 'Salvar texto'}</Button>;
}

export default function CollectionMessageForm({ defaultValue }: { defaultValue: string }) {
  const [state, action] = useFormState(updateCollectionMessageTemplate, initialState);

  useEffect(() => {
    if (!state.message) return;
    if (state.success) toast.success(state.message);
    else toast.error(state.message);
  }, [state]);

  return (
    <form action={action} className="space-y-3">
      <Textarea
        name="collectionMessage"
        defaultValue={defaultValue}
        rows={6}
        className="min-h-32"
      />
      <p className="text-xs text-slate-500">
        Variáveis disponíveis: {'{cliente}'}, {'{valor}'} e {'{vencimento}'}.
      </p>
      <SubmitButton />
    </form>
  );
}
