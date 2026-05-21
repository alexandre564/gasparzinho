'use client';

import { useEffect, useRef } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { importCustomers } from './actions';

const initialState = {
  success: false,
  message: '',
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="sm" variant="outline" className="gap-2" disabled={pending}>
      <Upload className="h-4 w-4" />
      {pending ? 'Importando...' : 'Importar clientes'}
    </Button>
  );
}

export default function ImportCustomersButton() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useFormState(importCustomers, initialState);

  useEffect(() => {
    if (!state.message) {
      return;
    }

    if (state.success) {
      toast.success(state.message);
      formRef.current?.reset();
    } else {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <form ref={formRef} action={action} className="flex flex-wrap items-center gap-2">
      <label className="flex h-9 cursor-pointer items-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50">
        Escolher CSV
        <input name="file" type="file" accept=".csv,text/csv" className="sr-only" required />
      </label>
      <SubmitButton />
    </form>
  );
}