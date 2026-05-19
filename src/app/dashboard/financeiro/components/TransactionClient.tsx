'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { addTransaction } from '../actions';
import { Transaction, TransactionType } from '@prisma/client';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending} className="w-full">
            {pending ? 'Adicionando...' : 'Adicionar Transação'}
        </Button>
    );
}

export function AddTransactionForm() {
    const [state, dispatch] = useFormState(addTransaction, { message: null, errors: {} });
    const formRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        if (state.message && !state.errors) {
            toast.success(state.message);
            formRef.current?.reset();
        } else if (state.message && state.errors) {
            toast.error(state.message, {
                description: Object.values(state.errors).flat().join(' \n')
            });
        }
    }, [state]);

    return (
        <form ref={formRef} action={dispatch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="amount">Valor</label>
                    <Input id="amount" name="amount" type="number" step="0.01" placeholder="R$ 0,00" required />
                     {state.errors?.amount && <p className="text-sm text-red-500">{state.errors.amount[0]}</p>}
                </div>
                <div>
                    <label htmlFor="type">Tipo</label>
                     <select 
                        id="type" 
                        name="type" 
                        required 
                        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <option value="RECEITA">Receita</option>
                        <option value="DESPESA">Despesa</option>
                    </select>
                    {state.errors?.type && <p className="text-sm text-red-500">{state.errors.type[0]}</p>}
                </div>
            </div>
             <div>
                <label htmlFor="description">Descrição</label>
                <Input id="description" name="description" placeholder="Ex: Pagamento de fornecedor" required />
                {state.errors?.description && <p className="text-sm text-red-500">{state.errors.description[0]}</p>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="category">Categoria</label>
                    <Input id="category" name="category" placeholder="Ex: Vendas, Marketing" />
                </div>
                <div>
                    <label htmlFor="date">Data</label>
                    <Input id="date" name="date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required />
                     {state.errors?.date && <p className="text-sm text-red-500">{state.errors.date[0]}</p>}
                </div>
            </div>
            <SubmitButton />
        </form>
    );
}

interface TransactionListProps {
    transactions: Transaction[];
}

export function TransactionList({ transactions }: TransactionListProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Histórico de Transações</CardTitle>
            </CardHeader>
            <CardContent>
                 <ul className="divide-y divide-gray-200">
                    {transactions.map(t => (
                        <li key={t.id} className="py-3 flex justify-between items-center">
                            <div>
                                <p className="font-semibold">{t.description}</p>
                                <p className="text-sm text-gray-500">{formatDateTime(t.date)}</p>
                            </div>
                            <span className={`font-semibold ${t.type === 'RECEITA' ? 'text-green-600' : 'text-red-600'}`}>
                                {t.type === 'DESPESA' ? '-' : '+'}{formatCurrency(Number(t.amount))}
                            </span>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
}