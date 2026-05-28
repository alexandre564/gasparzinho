import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireApiAccess } from '@/lib/api-auth';

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

    await prisma.debt.update({
      where: { id },
      data: {
        status: 'PAGO',
        paidAt: new Date(),
      },
    });

    revalidatePath('/dashboard/financeiro/dividas');
    revalidatePath('/dashboard/cobranca');

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
