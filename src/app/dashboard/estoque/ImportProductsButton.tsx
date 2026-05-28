'use client';

import { useEffect, useRef, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { FileUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { importProducts, type ImportProductsState } from './actions';

const initialState: ImportProductsState = {
  success: false,
  message: '',
};

function ImportButton({ onClick, fileName }: { onClick: () => void; fileName: string }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="gap-2"
      disabled={pending}
      onClick={onClick}
      aria-label="Importar produtos de arquivo CSV, CDSV ou TXT"
      title="Importar produtos"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
      {pending ? 'Importando...' : fileName || 'Importar produtos'}
    </Button>
  );
}

export default function ImportProductsButton() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [state, action] = useFormState(importProducts, initialState);

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
