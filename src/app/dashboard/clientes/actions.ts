'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const DebtStatus = { PENDENTE: 'PENDENTE', PAGO: 'PAGO', VENCIDO: 'VENCIDO', ABERTA: 'ABERTA', CANCELADA: 'CANCELADA' } as const;

const CustomerFormSchema = z.object({
  name: z.string().min(3, { message: "O nome precisa ter pelo menos 3 caracteres." }),
  phone: z.string().min(10, { message: "O telefone precisa ser válido." }),
  cep: z.string().optional(),
  street: z.string().optional(),
  number: z.string().min(1, { message: "O número é obrigatório." }),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().default('Lavras'),
  reference: z.string().optional(),
});

export type CustomerFormState = { 
    success: boolean;
    message: string;
    errors?: z.ZodIssue[];
};

export async function createCustomer(values: z.infer<typeof CustomerFormSchema>): Promise<CustomerFormState> {
    const validatedFields = CustomerFormSchema.safeParse(values);

    if (!validatedFields.success) {
        return {
            success: false,
            message: "Erro de validação. Verifique os campos.",
            errors: validatedFields.error.issues,
        };
    }

    try {
        const { street, complement, neighborhood, reference, cep, ...rest } = validatedFields.data;
        await prisma.customer.create({ 
            data: { 
                ...rest, 
                street: street ?? '', 
                complement: complement ?? '', 
                neighborhood: neighborhood ?? '', 
                reference: reference ?? '', 
                cep: cep ?? '', 
            }
        });
        revalidatePath('/dashboard/clientes');
        return { success: true, message: 'Cliente criado com sucesso.' };
    } catch (error) {
        console.error(error);
        return { success: false, message: 'Erro no banco de dados ao criar o cliente.' };
    }
}

export async function updateCustomer(id: string, values: z.infer<typeof CustomerFormSchema>): Promise<CustomerFormState> {
    const validatedFields = CustomerFormSchema.safeParse(values);

    if (!validatedFields.success) {
        return {
            success: false,
            message: "Erro de validação. Verifique os campos.",
            errors: validatedFields.error.issues,
        };
    }

    try {
        const { street, complement, neighborhood, reference, cep, ...rest } = validatedFields.data;
        await prisma.customer.update({ 
            where: { id }, 
            data: { 
                ...rest, 
                street: street ?? '', 
                complement: complement ?? '', 
                neighborhood: neighborhood ?? '', 
                reference: reference ?? '', 
                cep: cep ?? '', 
            }
        });
        revalidatePath('/dashboard/clientes');
        revalidatePath(`/dashboard/clientes/${id}/editar`);
        return { success: true, message: 'Cliente atualizado com sucesso.' };
    } catch (error) {
        console.error(error);
        return { success: false, message: 'Erro no banco de dados ao atualizar o cliente.' };
    }
}

export async function deleteCustomer(id: string) {
  try {
    // Para evitar erros de deleção por restrições de chave estrangeira, 
    // é mais seguro desassociar ou deletar registros relacionados primeiro.
    // Neste caso, vamos apenas deletar o cliente se ele não tiver ordens ou dívidas.
    const related = await prisma.customer.findUnique({
      where: { id },
      include: { _count: { select: { orders: true, debts: true } } }
    });

    if (related?._count.orders || related?._count.debts) {
      return { success: false, message: "Este cliente possui pedidos ou dívidas e não pode ser excluído." };
    }

    await prisma.customer.delete({ where: { id } });
    revalidatePath('/dashboard/clientes');
    return { success: true, message: "Cliente excluído com sucesso." };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Ocorreu um erro ao excluir o cliente." };
  }
}

const ITEMS_PER_PAGE = 10;
export async function getPaginatedCustomers(query: string, currentPage: number) {
    const offset = (currentPage - 1) * ITEMS_PER_PAGE;

    try {
        const customers = await prisma.customer.findMany({
            where: {
                OR: [
                    { name: { contains: query } },
                    { phone: { contains: query } },
                ],
            },
            include: {
                orders: {
                    orderBy: { createdAt: 'desc' },
                    take: 1, // Pega apenas o último pedido
                },
                _count: {
                    select: { orders: true },
                },
                debts: {
                    where: { status: DebtStatus.ABERTA },
                },
            },
            orderBy: { name: 'asc' },
            take: ITEMS_PER_PAGE,
            skip: offset,
        });

        const count = await prisma.customer.count({
             where: {
                OR: [
                    { name: { contains: query } },
                    { phone: { contains: query } },
                ],
            },
        });

        // Processamento para calcular valores agregados
        const enhancedCustomers = customers.map(customer => {
            const lastPurchase = customer.orders[0]?.createdAt;
            const daysSinceLastPurchase = lastPurchase ? Math.floor((new Date().getTime() - new Date(lastPurchase).getTime()) / (1000 * 60 * 60 * 24)) : null;
            const totalDebt = customer.debts.reduce((sum, debt) => sum + debt.value, 0);

            return {
                ...customer,
                lastPurchase,
                daysSinceLastPurchase,
                totalOrders: customer._count.orders,
                totalDebt,
            };
        });

        return {
            customers: enhancedCustomers,
            totalPages: Math.ceil(count / ITEMS_PER_PAGE),
        };

    } catch (err) {
        console.error('Database Error:', err);
        throw new Error('Failed to fetch customers.');
    }
}

export async function getCustomerById(id: string) {
  try {
    const customer = await prisma.customer.findUnique({ where: { id } });
    return customer;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch customer.');
  }
}
