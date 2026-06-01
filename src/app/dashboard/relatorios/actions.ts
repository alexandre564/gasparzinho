'use server';

import { prisma } from '@/lib/prisma';
import { buildBranchWhere } from '@/lib/branch-scope';
import { getCurrentBranchScope } from '@/lib/current-branch-scope';

export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface SalesReportPoint {
  name: string;
  total: number;
  expenses: number;
  net: number;
  ordersCount: number;
  avgTicket: number;
}

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function startOfWeek(date: Date) {
  const value = startOfDay(date);
  const day = value.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  value.setDate(value.getDate() + diff);
  return value;
}

function endOfWeek(date: Date) {
  const value = startOfWeek(date);
  value.setDate(value.getDate() + 6);
  value.setHours(23, 59, 59, 999);
  return value;
}

function startOfYear(date: Date) {
  return new Date(date.getFullYear(), 0, 1);
}

function endOfYear(date: Date) {
  return new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
}

function getPointDate(period: ReportPeriod, index: number, now = new Date()) {
  const date = new Date(now);
  if (period === 'daily') {
    date.setDate(now.getDate() - index);
    return date;
  }
  if (period === 'weekly') {
    date.setDate(now.getDate() - index * 7);
    return date;
  }
  if (period === 'yearly') {
    date.setFullYear(now.getFullYear() - index);
    return date;
  }
  return new Date(now.getFullYear(), now.getMonth() - index, 1);
}

function getPointRange(period: ReportPeriod, date: Date) {
  if (period === 'daily') return { start: startOfDay(date), end: endOfDay(date) };
  if (period === 'weekly') return { start: startOfWeek(date), end: endOfWeek(date) };
  if (period === 'yearly') return { start: startOfYear(date), end: endOfYear(date) };
  return { start: startOfMonth(date), end: endOfMonth(date) };
}

function getPointName(period: ReportPeriod, date: Date) {
  if (period === 'daily') return date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
  if (period === 'weekly') return `Sem ${startOfWeek(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
  if (period === 'yearly') return String(date.getFullYear());
  return date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
}

async function getPeriodTotals(start: Date, end: Date) {
  const branchScope = await getCurrentBranchScope();
  const orderWhere = {
    createdAt: { gte: start, lte: end },
    status: { not: 'CANCELADO' },
  };
  const [ordersTotal, ordersCount, expensesTotal] = await prisma.$transaction([
    prisma.order.aggregate({
      _sum: { grossValue: true },
      where: buildBranchWhere(branchScope, orderWhere),
    }),
    prisma.order.count({ where: buildBranchWhere(branchScope, orderWhere) }),
    prisma.expense.aggregate({
      _sum: { value: true },
      where: buildBranchWhere(branchScope, { date: { gte: start, lte: end } }),
    }),
  ]);
  const total = ordersTotal._sum.grossValue ?? 0;
  const expenses = expensesTotal._sum.value ?? 0;

  return {
    total,
    expenses,
    net: total - expenses,
    ordersCount,
    avgTicket: ordersCount > 0 ? total / ordersCount : 0,
  };
}

export async function getSalesReportData(period: ReportPeriod): Promise<SalesReportPoint[]> {
  const now = new Date();

  const length = period === 'yearly' ? 5 : period === 'monthly' ? 6 : period === 'weekly' ? 8 : 7;
  const points = await Promise.all(
    Array.from({ length }).map(async (_, index) => {
      const pointDate = getPointDate(period, index, now);
      const range = getPointRange(period, pointDate);
      const totals = await getPeriodTotals(range.start, range.end);

      return {
        name: getPointName(period, pointDate),
        ...totals,
      };
    })
  );

  return points.reverse();
}
