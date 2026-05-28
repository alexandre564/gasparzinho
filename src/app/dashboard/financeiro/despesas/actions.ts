'use server';

import { endOfDay, endOfMonth, endOfWeek, startOfDay, startOfMonth, startOfWeek, subDays } from 'date-fns';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';

export type CreateExpenseState = {
  success: boolean;
  message: string;
  errors?: {
    description?: string[];
    value?: string[];
    date?: string[];
    category?: string[];
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
  isRecurring: z.preprocess((value) => value === 'true', z.boolean().default(false)),
});

const ITEMS_PER_PAGE = 10;

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

export async function getPaginatedExpenses(query: string, currentPage: number, category?: string) {
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  const where: Prisma.ExpenseWhereInput = {
    ...(category && { category }),
    ...(query && { description: { contains: query } }),
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
    await prisma.expense.create({ data: validatedFields.data });
    revalidatePath('/dashboard/financeiro');
    revalidatePath('/dashboard/financeiro/despesas');
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
    const isRecurring = parseBooleanValue(
      pickValue(row, ['recorrente', 'fixa', 'mensal', 'is recurring']),
    );

    if (!description || value === null || value <= 0 || !date) {
      ignored += 1;
      continue;
    }

    await prisma.expense.create({
      data: {
        description,
        value,
        date,
        category,
        isRecurring,
      },
    });

    imported += 1;
  }

  revalidatePath('/dashboard/financeiro');
  revalidatePath('/dashboard/financeiro/despesas');

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
  try {
    await prisma.expense.delete({ where: { id } });
    revalidatePath('/dashboard/financeiro');
    revalidatePath('/dashboard/financeiro/despesas');
    return { success: true, message: 'Despesa excluída com sucesso.' };
  } catch (error) {
    console.error('Database Error:', error);
    return { success: false, message: 'Falha ao excluir despesa.' };
  }
}

async function getRevenue(from: Date, to: Date) {
  const result = await prisma.order.aggregate({
    _sum: { netValue: true },
    where: { createdAt: { gte: from, lte: to }, status: { not: 'CANCELADO' } },
  });

  return result._sum.netValue ?? 0;
}

async function getExpenses(from: Date, to: Date) {
  const result = await prisma.expense.aggregate({
    _sum: { value: true },
    where: { date: { gte: from, lte: to } },
  });

  return result._sum.value ?? 0;
}

export async function getFinancialSummary() {
  const now = new Date();
  const [revenueToday, expensesToday, revenueWeek, expensesWeek, revenueMonth, expensesMonth] =
    await Promise.all([
      getRevenue(startOfDay(now), endOfDay(now)),
      getExpenses(startOfDay(now), endOfDay(now)),
      getRevenue(startOfWeek(now, { weekStartsOn: 1 }), endOfWeek(now, { weekStartsOn: 1 })),
      getExpenses(startOfWeek(now, { weekStartsOn: 1 }), endOfWeek(now, { weekStartsOn: 1 })),
      getRevenue(startOfMonth(now), endOfMonth(now)),
      getExpenses(startOfMonth(now), endOfMonth(now)),
    ]);

  return {
    today: { revenue: revenueToday, expenses: expensesToday, net: revenueToday - expensesToday },
    week: { revenue: revenueWeek, expenses: expensesWeek, net: revenueWeek - expensesWeek },
    month: { revenue: revenueMonth, expenses: expensesMonth, net: revenueMonth - expensesMonth },
  };
}

export async function getWeeklyChartData() {
  const today = new Date();
  const data = [];

  for (let index = 6; index >= 0; index -= 1) {
    const date = subDays(today, index);
    const dayName = date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
    const [revenue, expenses] = await Promise.all([
      getRevenue(startOfDay(date), endOfDay(date)),
      getExpenses(startOfDay(date), endOfDay(date)),
    ]);

    data.push({ name: dayName, Entradas: revenue, Saidas: expenses });
  }

  return data;
}
