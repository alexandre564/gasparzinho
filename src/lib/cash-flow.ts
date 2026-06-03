import type { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { buildBranchWhere, type BranchScope } from '@/lib/branch-scope';

export const CASH_ENTRY_TYPE_INCOME = 'ENTRADA';
export const CASH_ENTRY_CATEGORY_DEBT_PAYMENT = 'Recebimento de divida';
export const CASH_ENTRY_SOURCE_DEBT_PAYMENT = 'DEBT_PAYMENT';
export const CASH_ENTRY_SOURCE_DEBT_PARTIAL_PAYMENT = 'DEBT_PARTIAL_PAYMENT';
export const FIADO_PAYMENT_METHOD = 'FIADO';

type CashEntryClient = Pick<Prisma.TransactionClient, 'cashEntry'>;

export function isCashSalePayment(paymentMethod?: string | null) {
  return (paymentMethod ?? '').toUpperCase() !== FIADO_PAYMENT_METHOD;
}

export async function getCashEntriesTotal(from: Date, to: Date, branchScope: BranchScope) {
  const result = await prisma.cashEntry.aggregate({
    _sum: { value: true },
    where: buildBranchWhere(branchScope, {
      type: CASH_ENTRY_TYPE_INCOME,
      date: { gte: from, lte: to },
    }),
  });

  return result._sum.value ?? 0;
}

export async function getCashSalesTotal(from: Date, to: Date, branchScope: BranchScope) {
  const result = await prisma.order.aggregate({
    _sum: { grossValue: true },
    where: buildBranchWhere(branchScope, {
      createdAt: { gte: from, lte: to },
      status: { not: 'CANCELADO' },
      paymentMethod: { not: FIADO_PAYMENT_METHOD },
    }),
  });

  return result._sum.grossValue ?? 0;
}

export async function getCashRevenueTotal(from: Date, to: Date, branchScope: BranchScope) {
  const [cashSales, cashEntries] = await Promise.all([
    getCashSalesTotal(from, to, branchScope),
    getCashEntriesTotal(from, to, branchScope),
  ]);

  return cashSales + cashEntries;
}

export async function getCashEntries(
  from: Date,
  to: Date,
  branchScope: BranchScope,
  take?: number,
) {
  return prisma.cashEntry.findMany({
    where: buildBranchWhere(branchScope, {
      type: CASH_ENTRY_TYPE_INCOME,
      date: { gte: from, lte: to },
    }),
    orderBy: { date: 'asc' },
    ...(take ? { take } : {}),
  });
}

export async function createDebtPaymentCashEntry(
  tx: CashEntryClient,
  input: {
    debtId: string;
    orderId?: string | null;
    customerId: string;
    customerName?: string | null;
    value: number;
    date?: Date | null;
    branchId?: string | null;
    paymentMethod?: string | null;
    responsible?: string | null;
    source?: typeof CASH_ENTRY_SOURCE_DEBT_PAYMENT | typeof CASH_ENTRY_SOURCE_DEBT_PARTIAL_PAYMENT;
    notes?: string | null;
  },
) {
  const value = Number(input.value);

  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  return tx.cashEntry.create({
    data: {
      type: CASH_ENTRY_TYPE_INCOME,
      category: CASH_ENTRY_CATEGORY_DEBT_PAYMENT,
      description: `Pagamento de fiado${input.customerName ? ` - ${input.customerName}` : ''}`,
      value,
      date: input.date ?? new Date(),
      source: input.source ?? CASH_ENTRY_SOURCE_DEBT_PAYMENT,
      debtId: input.debtId,
      orderId: input.orderId ?? null,
      customerId: input.customerId,
      paymentMethod: input.paymentMethod ?? 'Nao informado',
      responsible: input.responsible ?? 'Sistema',
      notes: input.notes ?? null,
      branchId: input.branchId ?? null,
    },
  });
}
