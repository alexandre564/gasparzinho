'use client';

import { useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { toast } from 'sonner';
import { createExpense } from './actions';

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from 'lucide-react';
import { ExpenseCategory } from '@prisma/client';

const initialState = { message: null, errors: {} };

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="w-full">
            {pending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Adicionando...</> : 'Adicionar Despesa'}
        </Button>
    )
}

export default function ExpenseForm() {
    const [state, dispatch] = useFormState(createExpense, initialState);

    useEffect(() => {
        if (state.success === true) {
            toast.success(state.message);
            document.getElementById('expense-form')?.reset(); // Reset form on success
        } else if (state.success === false && typeof state.message === 'string') {
            toast.error(state.message);
        }
    }, [state]);

  return (
    <form id="expense-form" action={dispatch} className="space-y-4">
        
        <div className="space-y-1">
            <Label htmlFor="description">Descrição</Label>
            <Input id="description" name="description" required />
            {state?.errors?.description && <p className="text-sm text-red-500">{state.errors.description[0]}</p>}
        </div>

         <div className="space-y-1">
            <Label htmlFor="value">Valor</Label>
            <Input id="value" name="value" type="number" step="0.01" required />
            {state?.errors?.value && <p className="text-sm text-red-500">{state.errors.value[0]}</p>}
        </div>

        <div className="space-y-1">
            <Label htmlFor="date">Data</Label>
            <Input id="date" name="date" type="date" defaultValue={new Date().toISOString().substring(0, 10)} required />
            {state?.errors?.date && <p className="text-sm text-red-500">{state.errors.date[0]}</p>}
        </div>

        <div className="space-y-1">
            <Label htmlFor="category">Categoria</Label>
            <Select name="category" required>
                <SelectTrigger><SelectValue placeholder="Selecione uma categoria..." /></SelectTrigger>
                <SelectContent>
                    {Object.values(ExpenseCategory).map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                </SelectContent>
            </Select>
            {state?.errors?.category && <p className="text-sm text-red-500">{state.errors.category[0]}</p>}
        </div>

        <div className="flex items-center space-x-2">
            <Checkbox id="isRecurring" name="isRecurring" value="true"/>
            <label htmlFor="isRecurring" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Despesa Recorrente</label>
        </div>

        <SubmitButton/>

    </form>
  );
}
