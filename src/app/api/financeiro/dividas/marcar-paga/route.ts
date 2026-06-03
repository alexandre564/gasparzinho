import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireApiAccess } from '@/lib/api-auth';
import { buildBranchWhere } from '@/lib/branch-scope';
import { createDebtPaymentCashEntry } from '@/lib/cash-flow';
import { getCurrentBranchScope } from '@/lib/current-branch-scope';
import { isDebtClosedStatus } from '@/lib/debts';

export const runtime = 'nodejs';

export async function PATCH(request: Request) {
  const denied = await requireApiAccess(['ADMIN']);

  if (denied) {
    return denied;
  }

  try {
    const body = await request.json();
    const { id } = body as { id?: string };

    if (!id) {
      return Response.json(
        { success: false, message: 'ID da dívida não informado.' },
        { status: 400 },
      );
    }

    const branchScope = await getCurrentBranchScope();
    const debt = await prisma.debt.findFirst({
      where: buildBranchWhere(branchScope, { id }),
      include: { customer: { select: { name: true } } },
    });

    if (!debt) {
      return Response.json(
        { success: false, message: 'Dívida não encontrada para esta filial.' },
        { status: 404 },
      );
    }

    if (isDebtClosedStatus(debt.status)) {
      return Response.json({
        success: true,
        message: 'Dívida já estava encerrada.',
      });
    }

    const paidAt = new Date();
    const paymentValue = debt.renegotiatedValue ?? debt.value;

    await prisma.$transaction(async (tx) => {
      await createDebtPaymentCashEntry(tx, {
        debtId: debt.id,
        orderId: debt.orderId,
        customerId: debt.customerId,
        customerName: debt.customer.name,
        value: paymentValue,
        date: paidAt,
        branchId: debt.branchId ?? branchScope.branchId,
        notes: 'Recebimento integral registrado em financeiro/dividas.',
      });

      await tx.debt.update({
        where: { id: debt.id },
        data: {
          status: 'PAGO',
          paidAt,
        },
      });
    });

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/financeiro');
    revalidatePath('/dashboard/financeiro/dividas');
    revalidatePath('/dashboard/cobranca');
    revalidatePath('/dashboard/fechamento');

    return Response.json({
      success: true,
      message: 'Dívida marcada como paga.',
    });
  } catch (error) {
    console.error('Database Error:', error);

    return Response.json(
      { success: false, message: 'Falha ao atualizar a dívida.' },
      { status: 500 },
    );
  }
}
