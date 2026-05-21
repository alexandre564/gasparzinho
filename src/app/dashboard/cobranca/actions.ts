'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const optionalDate = z.preprocess((value) => {
  if (value === '' || value === null || value === undefined) return undefined;
  return value;
}, z.coerce.date().optional());

const DebtActionSchema = z.object({
  renegotiatedValue: z.coerce.number().positive('Informe um valor para pagamento maior que zero.'),
  newDueDate: z.coerce.date({ message: 'Informe a nova data prevista.' }),
  paidAt: optionalDate,
  notes: z.string().trim().max(500, 'Use no máximo 500 caracteres.').optional(),
});

export async function updateDebt(id: string, data: unknown) {
  const validatedData = DebtActionSchema.safeParse(data);

  if (!validatedData.success) {
    return {
      success: false as const,
      message: 'Erro de validação.',
      errors: validatedData.error.issues,
    };
  }

  try {
    const existingDebt = await prisma.debt.findUnique({ where: { id } });

    if (!existingDebt) {
      return { success: false as const, message: 'Dívida não encontrada.' };
    }

    const { renegotiatedValue, newDueDate, paidAt, notes } = validatedData.data;

    await prisma.debt.update({
      where: { id },
      data: {
        value: renegotiatedValue,
        dueDate: newDueDate,
        originalDueDate: existingDebt.originalDueDate ?? existingDebt.dueDate,
        renegotiatedAt: new Date(),
        renegotiatedValue,
        paidAt: paidAt ?? null,
        notes: notes || null,
        status: paidAt ? 'PAGO' : 'RENEGOCIADO',
      },
    });

    revalidatePath('/dashboard/cobranca');
    revalidatePath(`/dashboard/cobranca/${id}`);
    revalidatePath('/dashboard/financeiro/dividas');

    return { success: true as const, message: paidAt ? 'Dívida renegociada e marcada como paga.' : 'Dívida renegociada com sucesso!' };
  } catch (error) {
    console.error('Erro ao renegociar dívida:', error);
    return { success: false as const, message: 'Falha ao renegociar a dívida.' };
  }
}

export async function markAsPaid(id: string) {
  try {
    await prisma.debt.update({
      where: { id },
      data: {
        status: 'PAGO',
        paidAt: new Date(),
      },
    });

    revalidatePath('/dashboard/cobranca');
    revalidatePath('/dashboard/financeiro/dividas');

    return { success: true as const, message: 'Dívida marcada como paga!' };
  } catch (error) {
    console.error('Erro ao marcar dívida como paga:', error);
    return { success: false as const, message: 'Falha ao marcar como paga.' };
  }
}
