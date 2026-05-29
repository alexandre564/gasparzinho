'use client';

import { useEffect, useRef, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { createExpense, CreateExpenseState } from './actions';
import { EXPENSE_CATEGORIES, EXPENSE_PAYMENT_METHODS, EXPENSE_SUBCATEGORIES, expenseLabel } from './categories';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const initialState: CreateExpenseState = { message: '', success: false, errors: {} };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Salvando...
        </>
      ) : (
        'Adicionar gasto'
      )}
    </Button>
  );
}

export default function ExpenseForm() {
  const [state, dispatch] = useFormState(createExpense, initialState);
  const [category, setCategory] = useState<(typeof EXPENSE_CATEGORIES)[number]>('Outros');
  const formRef = useRef<HTMLFormElement>(null);
  const subcategories = EXPENSE_SUBCATEGORIES[category] ?? ['Outros'];

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      formRef.current?.reset();
      setCategory('Outros');
    } else if (!state.success && state.message && !state.errors) {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <form ref={formRef} id="expense-form" action={dispatch} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="description">Descrição</Label>
        <Input id="description" name="description" required />
        {state.errors?.description ? <p className="text-sm text-red-600">{state.errors.description[0]}</p> : null}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="value">Valor</Label>
          <Input id="value" name="value" type="number" step="0.01" min="0" required />
          {state.errors?.value ? <p className="text-sm text-red-600">{state.errors.value[0]}</p> : null}
        </div>

        <div className="space-y-1">
          <Label htmlFor="date">Data</Label>
          <Input id="date" name="date" type="date" defaultValue={new Date().toISOString().substring(0, 10)} required />
          {state.errors?.date ? <p className="text-sm text-red-600">{state.errors.date[0]}</p> : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="category">Categoria</Label>
          <Select name="category" value={category} onValueChange={(value) => setCategory(value as typeof category)}>
            <SelectTrigger id="category">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {EXPENSE_CATEGORIES.map((item) => (
                <SelectItem key={item} value={item}>
                  {expenseLabel(item)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {state.errors?.category ? <p className="text-sm text-red-600">{state.errors.category[0]}</p> : null}
        </div>

        <div className="space-y-1">
          <Label htmlFor="subCategory">Subcategoria</Label>
          <Select key={category} name="subCategory" defaultValue={subcategories[0] ?? 'Outros'} required>
            <SelectTrigger id="subCategory">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {subcategories.map((item) => (
                <SelectItem key={item} value={item}>
                  {expenseLabel(item)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {category === 'Frota/Veiculos' ? (
        <div className="space-y-1">
          <Label htmlFor="vehicleLabel">Veículo</Label>
          <Input id="vehicleLabel" name="vehicleLabel" placeholder="Ex.: placa, moto ou entregador" />
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="paymentMethod">Método de pagamento</Label>
          <Select name="paymentMethod" defaultValue="Pix" required>
            <SelectTrigger id="paymentMethod">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {EXPENSE_PAYMENT_METHODS.map((item) => (
                <SelectItem key={item} value={item}>
                  {expenseLabel(item)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="responsible">Responsável</Label>
          <Input id="responsible" name="responsible" placeholder="Quem lançou o gasto" required />
        </div>
      </div>

      <div className="flex items-center space-x-2 rounded-md border border-slate-200 p-3">
        <Checkbox id="isRecurring" name="isRecurring" value="true" />
        <label htmlFor="isRecurring" className="text-sm font-medium leading-none">
          Gasto recorrente
        </label>
      </div>

      <SubmitButton />
    </form>
  );
}
