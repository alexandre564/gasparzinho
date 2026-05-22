'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

export type DebtSortKey =
  | 'customer'
  | 'phone'
  | 'value'
  | 'dueDate'
  | 'daysLate'
  | 'status'
  | 'paidAt';

export type SortDirection = 'asc' | 'desc';

const ITEMS_PER_PAGE = 10;
const debtSortKeys: DebtSortKey[] = ['customer', 'phone', 'value', 'dueDate', 'daysLate', 'status', 'paidAt'];

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

type DebtWithRelations = Awaited<ReturnType<typeof prisma.debt.findMany>>[number] & {
  customer: { name: string; phone: string };
  order: { id: string; createdAt: Date } | null;
};

type EnhancedDebt = DebtWithRelations & {
  paymentValue: number;
  daysLate: number;
  isOpen: boolean;
};

type ImportDebtsState = {
  success: boolean;
  message: string;
};

function normalizeText(value: string | null | undefined) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function onlyDigits(value: string | null | undefined) {
  return (value ?? '').replace(/\D/g, '');
}

function normalizeSortKey(sort?: string): DebtSortKey {
  return debtSortKeys.includes(sort as DebtSortKey) ? (sort as DebtSortKey) : 'dueDate';
}

function normalizeSortDirection(direction?: string): SortDirection {
  return direction === 'desc' ? 'desc' : 'asc';
}

function calculateDaysLate(dueDate: Date, paidAt?: Date | null) {
  const referenceDate = paidAt ?? new Date();
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  referenceDate.setHours(0, 0, 0, 0);

  return Math.max(
    Math.floor((referenceDate.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)),
    0,
  );
}

function enhanceDebt(debt: DebtWithRelations): EnhancedDebt {
  return {
    ...debt,
    paymentValue: debt.renegotiatedValue ?? debt.value,
    daysLate: calculateDaysLate(debt.dueDate, debt.paidAt),
    isOpen: debt.status !== 'PAGO',
  };
}

function debtMatchesSearch(debt: EnhancedDebt, query: string) {
  const term = normalizeText(query);
  const digits = onlyDigits(query);

  if (!term && !digits) {
    return true;
  }

  const textMatch = [
    debt.customer.name,
    debt.customer.phone,
    debt.status,
    debt.notes,
    debt.id,
  ]
    .map(normalizeText)
    .some((field) => field.includes(term));
  const phoneMatch = Boolean(digits) && onlyDigits(debt.customer.phone).includes(digits);

  return textMatch || phoneMatch;
}

function compareNullableNumber(
  left: number | null | undefined,
  right: number | null | undefined,
  direction: SortDirection,
) {
  const leftMissing = left === null || left === undefined;
  const rightMissing = right === null || right === undefined;

  if (leftMissing && rightMissing) return 0;
  if (leftMissing) return 1;
  if (rightMissing) return -1;

  const result = left === right ? 0 : left < right ? -1 : 1;
  return direction === 'asc' ? result : -result;
}

function compareDebts(left: EnhancedDebt, right: EnhancedDebt, sort: DebtSortKey, direction: SortDirection) {
  if (sort === 'customer') {
    const result = left.customer.name.localeCompare(right.customer.name, 'pt-BR', { sensitivity: 'base' });
    return direction === 'asc' ? result : -result;
  }

  if (sort === 'phone') {
    const result = left.customer.phone.localeCompare(right.customer.phone, 'pt-BR', { sensitivity: 'base' });
    return direction === 'asc' ? result : -result;
  }

  if (sort === 'status') {
    const result = left.status.localeCompare(right.status, 'pt-BR', { sensitivity: 'base' });
    return direction === 'asc' ? result : -result;
  }

  if (sort === 'value') {
    return compareNullableNumber(left.paymentValue, right.paymentValue, direction);
  }

  if (sort === 'daysLate') {
    return compareNullableNumber(left.daysLate, right.daysLate, direction);
  }

  if (sort === 'paidAt') {
    return compareNullableNumber(left.paidAt?.getTime(), right.paidAt?.getTime(), direction);
  }

  return compareNullableNumber(left.dueDate.getTime(), right.dueDate.getTime(), direction);
}

export async function getPaginatedDebts(
  query: string,
  currentPage: number,
  sort?: string,
  direction?: string,
) {
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;
  const sortKey = normalizeSortKey(sort);
  const sortDirection = normalizeSortDirection(direction);
  const normalizedQuery = query.trim();

  const debts = await prisma.debt.findMany({
    include: {
      customer: { select: { name: true, phone: true } },
      order: { select: { id: true, createdAt: true } },
    },
    orderBy: { dueDate: 'asc' },
  });

  const sortedDebts = debts
    .map(enhanceDebt)
    .filter((debt) => debtMatchesSearch(debt, normalizedQuery))
    .sort((left, right) => {
      const openOrder = Number(right.isOpen) - Number(left.isOpen);

      if (sort === undefined && openOrder !== 0) {
        return openOrder;
      }

      const result = compareDebts(left, right, sortKey, sortDirection);

      if (result !== 0) {
        return result;
      }

      return left.customer.name.localeCompare(right.customer.name, 'pt-BR', { sensitivity: 'base' });
    });

  return {
    debts: sortedDebts.slice(offset, offset + ITEMS_PER_PAGE),
    totalPages: Math.ceil(sortedDebts.length / ITEMS_PER_PAGE),
    totalDebts: sortedDebts.length,
  };
}

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
    const nextDebtValue = fullPayment ? existingDebt.value : remainingValue;
    const nextRenegotiatedValue = fullPayment
      ? existingDebt.renegotiatedValue ?? existingDebt.value
      : remainingValue;
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
        value: nextDebtValue,
        dueDate: newDueDate,
        originalDueDate: existingDebt.originalDueDate ?? existingDebt.dueDate,
        renegotiatedAt: new Date(),
        renegotiatedValue: nextRenegotiatedValue,
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

function splitCsvLine(line: string, delimiter: string) {
  const result: string[] = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === delimiter && !quoted) {
      result.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
}

function normalizeHeader(value: string) {
  return value
    .replace(/^\uFEFF/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function detectDelimiter(headerLine: string) {
  const candidates = [';', ',', '\t'];
  return candidates
    .map((delimiter) => ({ delimiter, count: splitCsvLine(headerLine, delimiter).length }))
    .sort((a, b) => b.count - a.count)[0]?.delimiter ?? ';';
}

function pickValue(row: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];

    if (value !== undefined && value.trim()) {
      return value.trim();
    }
  }

  return '';
}

function parseDateValue(value: string) {
  if (!value.trim()) {
    return null;
  }

  const clean = value.trim();
  const brazilianDate = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (brazilianDate) {
    const [, day, month, year] = brazilianDate;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const parsed = new Date(clean);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseMoneyValue(value: string) {
  const clean = value
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const parsed = Number(clean);

  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDebtsCsv(text: string) {
  const cleanText = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rawLines = cleanText.split('\n').map((line) => line.trim()).filter(Boolean);
  const lines = rawLines[0]?.toLowerCase().startsWith('sep=') ? rawLines.slice(1) : rawLines;

  if (lines.length < 2) {
    return [];
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitCsvLine(lines[0], delimiter).map(normalizeHeader);

  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line, delimiter);
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });

    return {
      id: pickValue(row, ['id', 'codigo']),
      customerName: pickValue(row, ['cliente', 'nome', 'customer']),
      phone: pickValue(row, ['telefone', 'celular', 'whatsapp', 'phone']),
      value: parseMoneyValue(pickValue(row, ['valor para pagamento', 'valor', 'divida', 'restante'])),
      dueDate: parseDateValue(pickValue(row, ['vencimento', 'data vencimento', 'due date'])),
      paidAt: parseDateValue(pickValue(row, ['pagamento', 'pago em', 'paid at'])),
      renegotiatedAt: parseDateValue(pickValue(row, ['renegociado em', 'renegociacao'])),
      status: pickValue(row, ['status']).toUpperCase() || 'PENDENTE',
      notes: pickValue(row, ['observacoes', 'observacao', 'notes']),
    };
  });
}

export async function importDebts(
  _prevState: ImportDebtsState,
  formData: FormData,
): Promise<ImportDebtsState> {
  const file = formData.get('file');

  if (!(file instanceof File) || file.size === 0) {
    return { success: false, message: 'Selecione uma planilha CSV para importar.' };
  }

  if (!/\.(csv|cdsv|txt)$/i.test(file.name)) {
    return { success: false, message: 'Importe um arquivo CSV compatível com Excel.' };
  }

  try {
    const rows = parseDebtsCsv(await file.text());

    if (rows.length === 0) {
      return { success: false, message: 'Nenhuma cobrança válida encontrada na planilha.' };
    }

    let created = 0;
    let updated = 0;

    for (const row of rows) {
      const importedStatus = row.status || (row.paidAt ? 'PAGO' : 'PENDENTE');

      if (!row.dueDate || row.value < 0 || (row.value === 0 && importedStatus !== 'PAGO') || (!row.customerName && !row.phone)) {
        continue;
      }

      const phone = row.phone || `sem-telefone-${row.customerName}`;
      const customer = await prisma.customer.upsert({
        where: { phone },
        update: { name: row.customerName || phone },
        create: {
          name: row.customerName || phone,
          phone,
          street: '',
          number: 'S/N',
          neighborhood: '',
          city: 'Lavras',
        },
      });

      const existingDebt = row.id ? await prisma.debt.findUnique({ where: { id: row.id } }) : null;

      if (existingDebt) {
        await prisma.debt.update({
          where: { id: existingDebt.id },
          data: {
            customerId: customer.id,
            value: row.value,
            renegotiatedValue: row.value,
            dueDate: row.dueDate,
            paidAt: row.paidAt,
            renegotiatedAt: row.renegotiatedAt,
            status: importedStatus,
            notes: row.notes,
          },
        });
        await prisma.order.update({
          where: { id: existingDebt.orderId },
          data: {
            customerId: customer.id,
            paymentDueDate: row.dueDate,
            grossValue: row.value,
            netValue: row.value,
            status: importedStatus === 'PAGO' ? 'CONCLUIDO' : 'PENDENTE',
          },
        });
        updated += 1;
        continue;
      }

      const order = await prisma.order.create({
        data: {
          customerId: customer.id,
          status: importedStatus === 'PAGO' ? 'CONCLUIDO' : 'PENDENTE',
          paymentMethod: 'FIADO',
          paymentDueDate: row.dueDate,
          grossValue: row.value,
          totalCost: 0,
          netValue: row.value,
        },
      });

      await prisma.debt.create({
        data: {
          id: row.id || undefined,
          customerId: customer.id,
          orderId: order.id,
          value: row.value,
          dueDate: row.dueDate,
          paidAt: row.paidAt,
          renegotiatedAt: row.renegotiatedAt,
          renegotiatedValue: row.value,
          status: importedStatus,
          notes: row.notes,
        },
      });
      created += 1;
    }

    revalidatePath('/dashboard/cobranca');
    revalidatePath('/dashboard/financeiro/dividas');

    return {
      success: true,
      message: `Importação concluída: ${created} cobrança(s) criada(s) e ${updated} atualizada(s).`,
    };
  } catch (error) {
    console.error('Erro ao importar cobranças:', error);
    return { success: false, message: 'Erro ao importar cobranças.' };
  }
}
