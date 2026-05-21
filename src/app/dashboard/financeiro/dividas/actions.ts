'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const ITEMS_PER_PAGE = 15;

export async function getPaginatedDebts(query: string, currentPage: number, status?: string) {
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;
  try {
    const debts = await prisma.debt.findMany({
      where: {
        ...(status ? { status } : { status: { in: ['PENDENTE', 'VENCIDO'] } }),
        customer: { name: { contains: query } },
      },
      include: { customer: true, order: { include: { items: { include: { product: true } } } } },
      take: ITEMS_PER_PAGE,
      skip: offset,
      orderBy: { dueDate: 'asc' },
    });
    return debts;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Falha ao buscar dividas.');
  }
}

export async function getTotalOpenDebt(): Promise<{ totalOpen: number }> {
  try {
    const result = await prisma.debt.aggregate({
      _sum: { value: true },
      where: { status: { in: ['PENDENTE', 'VENCIDO'] } },
    });
    return { totalOpen: result._sum.value || 0 };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Falha ao calcular o total de dividas em aberto.');
  }
}

export async function markDebtAsPaid(debtId: string): Promise<{ success: boolean; message: string }> {
  if (!debtId) return { success: false, message: 'ID da divida e obrigatorio.' };
  try {
    await prisma.debt.update({ where: { id: debtId }, data: { status: 'PAGO' } });
    revalidatePath('/dashboard/financeiro/dividas');
    return { success: true, message: 'Divida marcada como paga com sucesso!' };
  } catch (error) {
    console.error('Database Error:', error);
    return { success: false, message: 'Falha ao atualizar o status da divida.' };
  }
}

export async function updateDebtStatus(debtId: string, status: string): Promise<{ success: boolean; message: string }> {
  try {
    await prisma.debt.update({ where: { id: debtId }, data: { status } });
    revalidatePath('/dashboard/financeiro/dividas');
    return { success: true, message: 'Status atualizado.' };
  } catch (error) {
    console.error('Database Error:', error);
    return { success: false, message: 'Falha ao atualizar.' };
  }
}

export async function renegotiateDebt(debtId: string, newValue: number, newDueDate: Date): Promise<{ success: boolean; message: string }> {
  try {
    await prisma.debt.update({ where: { id: debtId }, data: { value: newValue, dueDate: newDueDate, status: 'RENEGOCIADO' } });
    revalidatePath('/dashboard/financeiro/dividas');
    return { success: true, message: 'Divida renegociada com sucesso!' };
  } catch (error) {
    console.error('Database Error:', error);
    return { success: false, message: 'Falha ao renegociar.' };
  }
}
