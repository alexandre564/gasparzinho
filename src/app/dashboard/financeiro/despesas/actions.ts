'use server';

import { endOfDay, endOfMonth, endOfWeek, endOfYear, startOfDay, startOfMonth, startOfWeek, startOfYear, subDays, subMonths, subWeeks, subYears } from 'date-fns';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { requireActionAccess } from '@/lib/api-auth';
import { buildBranchWhere, type BranchScope } from '@/lib/branch-scope';
import { getCurrentBranchScope } from '@/lib/current-branch-scope';

export type CreateExpenseState = {
  success: boolean;
  message: string;
  errors?: {
    description?: string[];
    value?: string[];
    date?: string[];
    category?: string[];
    subCategory?: string[];
    paymentMethod?: string[];
    responsible?: string[];
    isRecurring?: string[];
  };
};

export type ImportExpensesState = {
  success: boolean;
  message: string;
};

const ExpenseSchema = z.object({
  description: z.string().min(3, { message: 'Descrição deve ter no mínimo 3 caracteres.' }),
  value: z.coerce.number().positive({ message: 'Valor deve ser positivo.' }),
  date: z.coerce.date({ error: 'Data inválida.' }),
  category: z.string().min(1, { message: 'Por favor, selecione uma categoria.' }),
  subCategory: z.string().trim().min(1, 'Informe a subcategoria.').max(80, 'Subcategoria muito longa.'),
  paymentMethod: z.string().trim().min(1, 'Informe o método de pagamento.').max(80, 'Método de pagamento muito longo.'),
  responsible: z.string().trim().min(2, 'Informe o responsável pelo lançamento.').max(120, 'Responsável muito longo.'),
  vehicleLabel: z.string().trim().max(120, 'Identificação do veículo muito longa.').optional(),
  isRecurring: z.preprocess((value) => value === 'true', z.boolean().default(false)),
});

const ITEMS_PER_PAGE = 10;
export type FinancialPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

function normalizeHeader(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function detectDelimiter(line: string) {
  const delimiters = [';', ',', '\t'];
  return delimiters.reduce((selected, delimiter) => {
    const currentCount = line.split(delimiter).length;
    const selectedCount = line.split(selected).length;
    return currentCount > selectedCount ? delimiter : selected;
  }, ';');
}

function parseCsvLine(line: string, delimiter: string) {
  const cells: string[] = [];
  let current = '';
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"' && nextChar === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === delimiter && !insideQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  cells.push(current.trim());
  return cells.map((cell) => cell.replace(/^"|"$/g, '').trim());
}

function parseMoneyValue(value: string) {
  const normalized = value
    .replace(/\s/g, '')
    .replace(/[R$]/gi, '')
    .replace(/\./g, '')
    .replace(',', '.');

  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function parseDateValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const isoDate = new Date(`${trimmed}T00:00:00`);
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed) && !Number.isNaN(isoDate.getTime())) {
    return isoDate;
  }

  const brMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brMatch) {
    const [, day, month, year] = brMatch;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    if (!Number.isNaN(date.getTime())) return date;
  }

  const fallback = new Date(trimmed);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function parseFilterDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseBooleanValue(value: string) {
  const normalized = normalizeHeader(value);
  return ['sim', 's', 'true', '1', 'recorrente', 'yes'].includes(normalized);
}

function pickValue(row: Record<string, string>, options: string[]) {
  for (const option of options) {
    const value = row[normalizeHeader(option)];
    if (value !== undefined && value.trim() !== '') return value.trim();
  }
  return '';
}

export async function getPaginatedExpenses(
  query: string,
  currentPage: number,
  category?: string,
  from?: string,
  to?: string,
) {
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;
  const fromDate = parseFilterDate(from);
  const toDate = parseFilterDate(to);

  if (toDate) {
    toDate.setHours(23, 59, 59, 999);
  }

  const where: Prisma.ExpenseWhereInput = {
    ...buildBranchWhere(await getCurrentBranchScope()),
    ...(category && { category }),
    ...(query && {
      OR: [
        { description: { contains: query } },
        { category: { contains: query } },
        { subCategory: { contains: query } },
        { paymentMethod: { contains: query } },
        { responsible: { contains: query } },
        { vehicleLabel: { contains: query } },
      ],
    }),
    ...(fromDate || toDate
      ? {
          date: {
            ...(fromDate ? { gte: fromDate } : {}),
            ...(toDate ? { lte: toDate } : {}),
          },
        }
      : {}),
  };

  try {
    const [expenses, totalExpenses] = await Promise.all([
      prisma.expense.findMany({
        where,
        orderBy: { date: 'desc' },
        take: ITEMS_PER_PAGE,
        skip: offset,
      }),
      prisma.expense.count({ where }),
    ]);

    return { expenses, totalPages: Math.ceil(totalExpenses / ITEMS_PER_PAGE) };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Falha ao buscar despesas.');
  }
}

export async function createExpense(
  prevState: CreateExpenseState,
  formData: FormData,
): Promise<CreateExpenseState> {
  const denied = await requireActionAccess(['ADMIN']);
  if (denied) return denied;

  const rawFormData = Object.fromEntries(formData.entries());

  if (!rawFormData.isRecurring) {
    rawFormData.isRecurring = 'false';
  }

  const validatedFields = ExpenseSchema.safeParse(rawFormData);

  if (!validatedFields.success) {
    return {
      success: false,
      message: 'Erro de validação. Corrija os campos e tente novamente.',
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    const branchScope = await getCurrentBranchScope();
    await prisma.expense.create({ data: { ...validatedFields.data, branchId: branchScope.branchId } });
    revalidatePath('/dashboard/financeiro');
    revalidatePath('/dashboard/financeiro/despesas');
    revalidatePath('/dashboard/gastos');
    return { success: true, message: 'Despesa criada com sucesso.', errors: {} };
  } catch (error) {
    console.error('Database Error:', error);
    return { success: false, message: 'Falha ao criar despesa no banco de dados.' };
  }
}

export async function importExpenses(
  _previousState: ImportExpensesState,
  formData: FormData,
): Promise<ImportExpensesState> {
  const denied = await requireActionAccess(['ADMIN']);
  if (denied) return denied;

  const file = formData.get('file');

  if (!(file instanceof File) || file.size === 0) {
    return { success: false, message: 'Selecione um arquivo CSV, CDSV ou TXT para importar.' };
  }

  const validExtension = /\.(csv|cdsv|txt)$/i.test(file.name);
  if (!validExtension) {
    return { success: false, message: 'Use um arquivo CSV, CDSV ou TXT compatível com Excel.' };
  }

  const content = (await file.text()).replace(/^\uFEFF/, '');
  const rawLines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (rawLines.length < 2) {
    return { success: false, message: 'A planilha precisa ter cabeçalho e pelo menos uma despesa.' };
  }

  const dataLines = rawLines[0].toLowerCase().startsWith('sep=') ? rawLines.slice(1) : rawLines;
  const delimiter = rawLines[0].toLowerCase().startsWith('sep=')
    ? rawLines[0].slice(4, 5)
    : detectDelimiter(dataLines[0]);
  const headers = parseCsvLine(dataLines[0], delimiter).map(normalizeHeader);

  let imported = 0;
  let ignored = 0;

  for (const line of dataLines.slice(1)) {
    const cells = parseCsvLine(line, delimiter);
    const row = headers.reduce<Record<string, string>>((accumulator, header, index) => {
      accumulator[header] = cells[index] ?? '';
      return accumulator;
    }, {});

    const description = pickValue(row, ['descricao', 'descrição', 'despesa', 'description']);
    const value = parseMoneyValue(pickValue(row, ['valor', 'value']));
    const date = parseDateValue(pickValue(row, ['data', 'date', 'competencia', 'competência']));
    const category = pickValue(row, ['categoria', 'category']) || 'Outros';
    const subCategory = pickValue(row, ['subcategoria', 'sub categoria', 'subcategory']);
    const paymentMethod = pickValue(row, ['metodo pagamento', 'método pagamento', 'forma pagamento', 'payment method']);
    const responsible = pickValue(row, ['responsavel', 'responsável', 'lancado por', 'lançado por', 'responsible']);
    const vehicleLabel = pickValue(row, ['veiculo', 'veículo', 'placa', 'vehicle']);
    const isRecurring = parseBooleanValue(
      pickValue(row, ['recorrente', 'fixa', 'mensal', 'is recurring']),
    );

    if (!description || value === null || value <= 0 || !date) {
      ignored += 1;
      continue;
    }

    const branchScope = await getCurrentBranchScope();
    await prisma.expense.create({
      data: {
        description,
        value,
        date,
        category,
        subCategory: subCategory || 'Outros',
        paymentMethod: paymentMethod || 'Nao informado',
        responsible: responsible || 'Importacao',
        vehicleLabel: vehicleLabel || null,
        isRecurring,
        branchId: branchScope.branchId,
      },
    });

    imported += 1;
  }

  revalidatePath('/dashboard/financeiro');
  revalidatePath('/dashboard/financeiro/despesas');
  revalidatePath('/dashboard/gastos');

  if (imported === 0) {
    return {
      success: false,
      message: `Nenhuma despesa foi importada. Verifique se as colunas de descrição, valor e data estão preenchidas. Linhas ignoradas: ${ignored}.`,
    };
  }

  return {
    success: true,
    message: `${imported} despesa(s) importada(s). Linhas ignoradas: ${ignored}.`,
  };
}

export async function deleteExpense(id: string): Promise<{ success: boolean; message: string }> {
  const denied = await requireActionAccess(['ADMIN']);
  if (denied) return denied;

  try {
    const branchScope = await getCurrentBranchScope();
    const deleted = await prisma.expense.deleteMany({ where: buildBranchWhere(branchScope, { id }) });
    if (deleted.count === 0) {
      return { success: false, message: 'Despesa não encontrada para esta filial.' };
    }
    revalidatePath('/dashboard/financeiro');
    revalidatePath('/dashboard/financeiro/despesas');
    revalidatePath('/dashboard/gastos');
    return { success: true, message: 'Despesa excluída com sucesso.' };
  } catch (error) {
    console.error('Database Error:', error);
    return { success: false, message: 'Falha ao excluir despesa.' };
  }
}

async function getRevenue(from: Date, to: Date, branchScope: BranchScope) {
  const result = await prisma.order.aggregate({
    _sum: { netValue: true },
    where: buildBranchWhere(branchScope, { createdAt: { gte: from, lte: to }, status: { not: 'CANCELADO' } }),
  });

  return result._sum.netValue ?? 0;
}

async function getExpenses(from: Date, to: Date, branchScope: BranchScope) {
  const result = await prisma.expense.aggregate({
    _sum: { value: true },
    where: buildBranchWhere(branchScope, { date: { gte: from, lte: to } }),
  });

  return result._sum.value ?? 0;
}

function getPeriodRange(period: FinancialPeriod, date = new Date()) {
  if (period === 'daily') {
    return { from: startOfDay(date), to: endOfDay(date), label: 'dia' };
  }

  if (period === 'weekly') {
    return {
      from: startOfWeek(date, { weekStartsOn: 1 }),
      to: endOfWeek(date, { weekStartsOn: 1 }),
      label: 'semana',
    };
  }

  if (period === 'yearly') {
    return { from: startOfYear(date), to: endOfYear(date), label: 'ano' };
  }

  return { from: startOfMonth(date), to: endOfMonth(date), label: 'mes' };
}

function getChartPointDate(period: FinancialPeriod, index: number, now = new Date()) {
  if (period === 'daily') return subDays(now, index);
  if (period === 'weekly') return subWeeks(now, index);
  if (period === 'yearly') return subYears(now, index);
  return subMonths(now, index);
}

function getChartPointRange(period: FinancialPeriod, date: Date) {
  if (period === 'daily') return { from: startOfDay(date), to: endOfDay(date) };
  if (period === 'weekly') {
    return {
      from: startOfWeek(date, { weekStartsOn: 1 }),
      to: endOfWeek(date, { weekStartsOn: 1 }),
    };
  }
  if (period === 'yearly') return { from: startOfYear(date), to: endOfYear(date) };
  return { from: startOfMonth(date), to: endOfMonth(date) };
}

function getChartPointName(period: FinancialPeriod, date: Date) {
  if (period === 'daily') {
    return date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
  }

  if (period === 'weekly') {
    return `Sem ${date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
  }

  if (period === 'yearly') {
    return String(date.getFullYear());
  }

  return date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
}

export async function getFinancialSummary(period: FinancialPeriod = 'monthly') {
  const now = new Date();
  const selectedRange = getPeriodRange(period, now);
  const branchScope = await getCurrentBranchScope();
  const [revenueToday, expensesToday, revenueWeek, expensesWeek, revenueMonth, expensesMonth] =
    await Promise.all([
      getRevenue(startOfDay(now), endOfDay(now), branchScope),
      getExpenses(startOfDay(now), endOfDay(now), branchScope),
      getRevenue(startOfWeek(now, { weekStartsOn: 1 }), endOfWeek(now, { weekStartsOn: 1 }), branchScope),
      getExpenses(startOfWeek(now, { weekStartsOn: 1 }), endOfWeek(now, { weekStartsOn: 1 }), branchScope),
      getRevenue(startOfMonth(now), endOfMonth(now), branchScope),
      getExpenses(startOfMonth(now), endOfMonth(now), branchScope),
    ]);
  const [periodRevenue, periodExpenses] = await Promise.all([
    getRevenue(selectedRange.from, selectedRange.to, branchScope),
    getExpenses(selectedRange.from, selectedRange.to, branchScope),
  ]);

  return {
    today: { revenue: revenueToday, expenses: expensesToday, net: revenueToday - expensesToday },
    week: { revenue: revenueWeek, expenses: expensesWeek, net: revenueWeek - expensesWeek },
    month: { revenue: revenueMonth, expenses: expensesMonth, net: revenueMonth - expensesMonth },
    current: {
      revenue: periodRevenue,
      expenses: periodExpenses,
      net: periodRevenue - periodExpenses,
      label: selectedRange.label,
    },
  };
}

export async function getWeeklyChartData(period: FinancialPeriod = 'daily') {
  const today = new Date();
  const data = [];
  const length = period === 'yearly' ? 5 : period === 'monthly' ? 6 : period === 'weekly' ? 8 : 7;
  const branchScope = await getCurrentBranchScope();

  for (let index = length - 1; index >= 0; index -= 1) {
    const date = getChartPointDate(period, index, today);
    const range = getChartPointRange(period, date);
    const name = getChartPointName(period, date);
    const [revenue, expenses] = await Promise.all([
      getRevenue(range.from, range.to, branchScope),
      getExpenses(range.from, range.to, branchScope),
    ]);

    data.push({ name, Entradas: revenue, Saidas: expenses });
  }

  return data;
}
