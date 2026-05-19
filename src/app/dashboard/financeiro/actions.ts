'use server';

import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';

const prisma = new PrismaClient();

const formSchema = z.object({
    description: z.string().min(2, { message: "A descrição deve ter pelo menos 2 caracteres." }),
    amount: z.coerce.number().positive({ message: "O valor deve ser positivo." }),
    type: z.enum(['REVENUE', 'EXPENSE']),
    date: z.string(),
});

export async function createTransaction(values: z.infer<typeof formSchema>) {
    try {
        const validatedData = formSchema.parse(values);

        await prisma.transaction.create({
            data: {
                description: validatedData.description,
                amount: validatedData.amount,
                type: validatedData.type,
                date: new Date(validatedData.date),
            },
        });

        revalidatePath('/dashboard/financeiro');

        return { success: true, message: "Transação criada com sucesso." };
    } catch (error) {
        console.error(error);
         if (error instanceof z.ZodError) {
            return { success: false, message: error.errors.map(e => e.message).join(', ') };
        }
        return { success: false, message: "Ocorreu um erro ao criar a transação." };
    }
}

export async function getFinancialOverview() {
    const transactions = await prisma.transaction.findMany({
        orderBy: {
            date: 'desc',
        },
    });

    const totalRevenue = transactions
        .filter((t) => t.type === 'REVENUE')
        .reduce((acc, t) => acc + t.amount, 0);

    const totalExpense = transactions
        .filter((t) => t.type === 'EXPENSE')
        .reduce((acc, t) => acc + t.amount, 0);

    const netBalance = totalRevenue - totalExpense;

    return {
        transactions,
        totalRevenue,
        totalExpense,
        netBalance,
    };
}
