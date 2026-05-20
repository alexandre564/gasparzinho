'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const DebtActionSchema = z.object({
  value: z.coerce.number().positive("O valor deve ser positivo."),
  dueDate: z.coerce.date({ message: "A data de vencimento é obrigatória." }),
  // A observação não está no modelo Debt, então não a incluirei no schema de validação.
  // Se for necessário, adicionarei uma tabela de renegociação ou um campo no modelo.
});

export async function updateDebt(id: string, data: unknown) {
  const validatedData = DebtActionSchema.safeParse(data);

  if (!validatedData.success) {
    return { 
      success: false as const, 
      message: 'Erro de validação.', 
      errors: validatedData.error.issues 
    };
  }

  try {
    await prisma.debt.update({
      where: { id },
      data: {
        ...validatedData.data,
        status: 'RENEGOTIATED',
      },
    })
    revalidatePath('/dashboard/cobranca')
    return { success: true as const, message: 'Dívida renegociada com sucesso!' }
  } catch (error) {
    return { success: false as const, message: 'Falha ao renegociar a dívida.' }
  }
}

export async function markAsPaid(id: string) {
  try {
    await prisma.debt.update({
      where: { id },
      data: {
        status: 'PAID',
      },
    })
    revalidatePath('/dashboard/cobranca')
    return { success: true as const, message: 'Dívida marcada como paga!' }
  } catch (error) {
    return { success: false as const, message: 'Falha ao marcar como paga.' }
  }
}
