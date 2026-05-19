import { prisma } from '@/lib/prisma';
import type { Expense } from '@prisma/client';
import { revalidatePath } from 'next/cache';

const formatCurrency = (amount: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
const formatDate = (date: Date) => new Intl.DateTimeFormat('pt-BR').format(date);

async function deleteExpense(formData: FormData) {
    'use server'
    const id = formData.get('id') as string;
    try {
        await prisma.expense.delete({ where: { id } });
        revalidatePath('/dashboard/financeiro/despesas');
    } catch (error) {
        console.error('Error deleting expense:', error);
        // Handle error appropriately in a real app
    }
}

export default function ExpensesList({ initialExpenses }: { initialExpenses: Expense[] }) {

    if (initialExpenses.length === 0) {
        return <p className="text-center text-gray-500">Nenhuma despesa registrada ainda.</p>;
    }

    return (
        <div className="space-y-4">
            {initialExpenses.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex-1">
                        <p className="font-semibold text-gray-800">{expense.description}</p>
                        <p className="text-sm text-gray-500">{formatDate(expense.date)}</p>
                    </div>
                    <div className="flex items-center space-x-4">
                        <p className="font-bold text-lg text-red-600">{formatCurrency(Number(expense.value))}</p>
                        <form action={deleteExpense}>
                            <input type="hidden" name="id" value={expense.id} />
                            <button 
                                type="submit"
                                className="px-3 py-1 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-md transition-colors"
                            >
                                Excluir
                            </button>
                        </form>
                    </div>
                </div>
            ))}
        </div>
    );
}
