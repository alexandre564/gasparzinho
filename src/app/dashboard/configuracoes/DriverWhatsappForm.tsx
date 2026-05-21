'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateDriverWhatsappNumber } from './actions';

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? 'Salvando...' : 'Salvar WhatsApp'}
    </Button>
  );
}

export default function DriverWhatsappForm({ defaultValue }: { defaultValue: string }) {
  const [state, action] = useFormState(updateDriverWhatsappNumber, {
    success: false,
    message: '',
  });

  return (
    <form action={action} className="space-y-3">
      <div className="space-y-2">
        <label htmlFor="driverWhatsapp" className="text-sm font-bold text-slate-800">
          WhatsApp do entregador
        </label>
        <Input
          id="driverWhatsapp"
          name="driverWhatsapp"
          defaultValue={defaultValue}
          placeholder="Ex.: 35999999999"
          inputMode="tel"
        />
        <p className="text-xs font-medium text-slate-500">
          Usado no botão Entregador para abrir a mensagem diretamente no WhatsApp.
        </p>
      </div>

      {state.message ? (
        <p className={state.success ? 'text-sm font-medium text-emerald-700' : 'text-sm font-medium text-red-700'}>
          {state.message}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
