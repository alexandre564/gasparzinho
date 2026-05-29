'use client';

import { useEffect, useRef, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { FileUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { importExpenses, ImportExpensesState } from './actions';
import { Button } from '@/components/ui/button';

const initialState: ImportExpensesState = {
  success: false,
  message: '',
};

function ImportButton({ onClick, fileName }: { onClick: () => void; fileName: string }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full gap-2 sm:w-auto"
      disabled={pending}
      onClick={onClick}
      aria-label="Importar gastos de arquivo CSV, CDSV ou TXT"
      title="Importar gastos"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
      {pending ? 'Importando...' : fileName || 'Importar gastos'}
    </Button>
  );
}

export default function ImportExpensesButton() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [state, action] = useFormState(importExpenses, initialState);

  useEffect(() => {
    if (!state.message) {
      return;
    }

    if (state.success) {
      toast.success(state.message);
      formRef.current?.reset();
      setFileName('');
      router.refresh();
    } else {
      toast.error(state.message);
    }
  }, [router, state]);

  return (
    <form ref={formRef} action={action} className="flex flex-wrap items-center gap-2">
      <input
        ref={fileInputRef}
        name="file"
        type="file"
        accept=".csv,.cdsv,.txt,text/csv"
        className="hidden"
        required
        onChange={(event) => {
          const selectedFileName = event.target.files?.[0]?.name ?? '';
          setFileName(selectedFileName);

          if (selectedFileName) {
            window.requestAnimationFrame(() => formRef.current?.requestSubmit());
          }
        }}
      />
      <ImportButton
        fileName={fileName}
        onClick={() => {
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
            fileInputRef.current.click();
          }
        }}
      />
    </form>
  );
}
