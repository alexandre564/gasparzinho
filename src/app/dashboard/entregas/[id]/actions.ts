'use server';

import { prisma } from '@/lib/prisma';
import { DeliveryStatus } from "@/types/enums";
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

// 1. Esquema de validação com Zod
const UpdateOrderSchema = z.object({
    deliveryStatus: z.string(),
    trackingCode: z.string().optional(),
});

// 2. Tipo de estado para o formulário
export type UpdateOrderState = {
    errors?: {
        deliveryStatus?: string[];
        trackingCode?: string[];
    };
    message?: string | null;
};

// 3. Server Action refatorada
export async function updateOrder(id: string, prevState: UpdateOrderState, formData: FormData) {
    // Extrair e validar os dados do formulário
    const validatedFields = UpdateOrderSchema.safeParse({
        deliveryStatus: formData.get('deliveryStatus'),
        trackingCode: formData.get('trackingCode'),
    });

    // Retornar erros de validação, se houver
    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: 'Erro de validação. Verifique os campos.',
        };
    }

    // Atualizar o pedido no banco de dados
    try {
        // @ts-ignore
      await (prisma.order as any).update({
            where: { id },
            data: {
                deliveryStatus: validatedFields.data.deliveryStatus,
                trackingCode: validatedFields.data.trackingCode,
            },
        });
    } catch (error) {
        console.error("Database Error:", error);
        return { message: 'Falha ao atualizar o pedido no banco de dados.' };
    }

    // 4. Revalidar cache e redirecionar
    revalidatePath(`/dashboard/entregas`);
    revalidatePath(`/dashboard/entregas/${id}`);
    redirect(`/dashboard/entregas`);
}
