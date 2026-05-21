'use client';

import { useEffect, useRef } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { addTransaction } from '../actions';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

type ExpenseItem = {
  id: string;
  description: string;
  category: string;
  value: number;
  date: Date;
  isRecurring: boolean;
};

type FormState = {
  success?: boolean;
  message: string | null;
  errors?: Record<string, string[]>;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? 'Adicionando...' : 'Adicionar despesa'}
    </Button>
  );
}

const initialState: FormState = {
  success: false,
  message: null,
  errors: {},
};

export function AddTransactionForm() {
  const [state, dispatch] = useFormState(addTransaction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success && state.message) {
      toast.success(state.message);
      formRef.current?.reset();
      return;
    }

    if (!state?.success && state?.message) {
      toast.error(state.message, {
        description: state.errors
          ? Object.values(state.errors).flat().join(' \n')
          : undefined,
      });
    }
  }, [state]);

  return (
    <form ref={formRef} action={dispatch} className="space-y-4">
      <div>
        <label htmlFor="description">Descricao</label>
        <Input
          id="description"
          name="description"
          placeholder="Ex: Pagamento de fornecedor"
          required
        />
        {state.errors?.description && (
          <p className="text-sm text-red-500">{state.errors.description[0]}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="category">Categoria</label>
          <Input
            id="category"
            name="category"
            placeholder="Ex: Marketing, Fornecedores"
            required
          />
          {state.errors?.category && (
            <p className="text-sm text-red-500">{state.errors.category[0]}</p>
          )}
        </div>

        <div>
          <label htmlFor="value">Valor</label>
          <Input
            id="value"
            name="value"
            type="number"
            step="0.01"
            placeholder="R$ 0,00"
            required
          />
          {state.errors?.value && (
            <p className="text-sm text-red-500">{state.errors.value[0]}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="date">Data</label>
          <Input
            id="date"
            name="date"
            type="date"
            defaultValue={new Date().toISOString().split('T')[0]}
            required
          />
          {state.errors?.date && (
            <p className="text-sm text-red-500">{state.errors.date[0]}</p>
          )}
        </div>

        <div className="flex items-end gap-2 rounded-md border p-3">
          <input
            id="isRecurring"
            name="isRecurring"
            type="checkbox"
            value="true"
            className="h-4 w-4"
          />
          <label htmlFor="isRecurring">Despesa recorrente</label>
        </div>
      </div>

      <SubmitButton />
    </form>
  );
}

interface TransactionListProps {
  transactions: ExpenseItem[];
}

export function TransactionList({ transactions }: TransactionListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Historico financeiro</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-gray-200">
          {transactions.map((t) => (
            <li key={t.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-semibold">{t.description}</p>
                <p className="text-sm text-gray-500">
                  {t.category} - {formatDateTime(t.date)}
                  {t.isRecurring ? ' - Recorrente' : ''}
                </p>
              </div>
              <span className="font-semibold text-red-600">
                -{formatCurrency(Number(t.value))}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
