'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const optionalDate = z.preprocess((value) => {
  if (value === '' || value === null || value === undefined) return undefined;
  return value;
}, z.coerce.date().optional());

const DebtActionSchema = z.object({
  paidAmount: z.coerce.number().min(0, 'O valor pago nao pode ser negativo.').default(0),
  remainingValue: z.coerce.number().min(0, 'O restante a receber nao pode ser negativo.'),
  newDueDate: z.coerce.date({ message: 'Informe a nova data prevista.' }),
  paymentDate: optionalDate,
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

    const { paidAmount, remainingValue, newDueDate, paymentDate, notes } = validatedData.data;
    const fullPayment = remainingValue <= 0;
    const paymentInfo = [
      `Valor pago nesta renegociacao: R$ ${paidAmount.toFixed(2)}`,
      paymentDate ? `Data do pagamento parcial: ${paymentDate.toLocaleDateString('pt-BR')}` : null,
      `Restante a receber: R$ ${remainingValue.toFixed(2)}`,
      notes ? `Observacoes: ${notes}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    await prisma.debt.update({
      where: { id },
      data: {
        value: remainingValue,
        dueDate: newDueDate,
        originalDueDate: existingDebt.originalDueDate ?? existingDebt.dueDate,
        renegotiatedAt: new Date(),
        renegotiatedValue: remainingValue,
        paidAt: fullPayment ? paymentDate ?? new Date() : null,
        notes: paymentInfo,
        status: fullPayment ? 'PAGO' : 'RENEGOCIADO',
      },
    });

    revalidatePath('/dashboard/cobranca');
    revalidatePath(`/dashboard/cobranca/${id}`);
    revalidatePath('/dashboard/financeiro/dividas');

    return {
      success: true as const,
      message: fullPayment
        ? 'Divida quitada e marcada como paga.'
        : 'Renegociacao salva. O restante continua pendente de cobranca.',
    };
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
