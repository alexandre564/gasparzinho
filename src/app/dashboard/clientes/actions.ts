'use server';

import { prisma } from '@/lib/prisma';
import { requireActionAccess } from '@/lib/api-auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  cleanCustomerTextFields,
  decodeContactText as decodeImportedContactText,
  normalizeImportedPhone as normalizeImportedPhoneValue,
  normalizeSearchText,
  onlyDigits as getContactDigits,
} from '@/lib/contact-text';
import { buildBranchWhere } from '@/lib/branch-scope';
import { getCurrentBranchScope } from '@/lib/current-branch-scope';

const OPEN_DEBT_STATUSES = ['PENDENTE', 'VENCIDO', 'RENEGOCIADO'] as const;

const CustomerFormSchema = z.object({
  name: z.string().min(3, { message: "O nome precisa ter pelo menos 3 caracteres." }),
  phone: z.string().min(10, { message: "O telefone precisa ser válido." }),
  cep: z.string().optional(),
  street: z.string().optional(),
  number: z.string().min(1, { message: "O número é obrigatório." }),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().default('Lavras'),
  reference: z.string().optional(),
});

export type CustomerFormState = { 
    success: boolean;
    message: string;
    customerId?: string;
    errors?: z.ZodIssue[];
};

export async function createCustomer(values: z.infer<typeof CustomerFormSchema>): Promise<CustomerFormState> {
    const denied = await requireActionAccess(['ADMIN', 'VENDEDOR']);
    if (denied) return denied;

    const validatedFields = CustomerFormSchema.safeParse(values);

    if (!validatedFields.success) {
        return {
            success: false,
            message: "Erro de validação. Verifique os campos.",
            errors: validatedFields.error.issues,
        };
    }

    try {
        const { street, complement, neighborhood, reference, cep, ...rest } = validatedFields.data;
        const customer = await prisma.customer.create({ 
            data: { 
                ...rest, 
                street: street ?? '', 
                complement: complement ?? '', 
                neighborhood: neighborhood ?? '', 
                reference: reference ?? '', 
                cep: cep ?? '', 
            }
        });
        revalidatePath('/dashboard/clientes');
        return { success: true, message: 'Cliente criado com sucesso.', customerId: customer.id };
    } catch (error) {
        console.error(error);
        return { success: false, message: 'Erro no banco de dados ao criar o cliente.' };
    }
}

export async function updateCustomer(id: string, values: z.infer<typeof CustomerFormSchema>): Promise<CustomerFormState> {
    const denied = await requireActionAccess(['ADMIN', 'VENDEDOR']);
    if (denied) return denied;

    const validatedFields = CustomerFormSchema.safeParse(values);

    if (!validatedFields.success) {
        return {
            success: false,
            message: "Erro de validação. Verifique os campos.",
            errors: validatedFields.error.issues,
        };
    }

    try {
        const { street, complement, neighborhood, reference, cep, ...rest } = validatedFields.data;
        await prisma.customer.update({ 
            where: { id }, 
            data: { 
                ...rest, 
                street: street ?? '', 
                complement: complement ?? '', 
                neighborhood: neighborhood ?? '', 
                reference: reference ?? '', 
                cep: cep ?? '', 
            }
        });
        revalidatePath('/dashboard/clientes');
        revalidatePath(`/dashboard/clientes/${id}/editar`);
        return { success: true, message: 'Cliente atualizado com sucesso.' };
    } catch (error) {
        console.error(error);
        return { success: false, message: 'Erro no banco de dados ao atualizar o cliente.' };
    }
}

export async function deleteCustomer(id: string) {
  const denied = await requireActionAccess(['ADMIN', 'VENDEDOR']);
  if (denied) return denied;

  try {
    // Para evitar erros de deleção por restrições de chave estrangeira, 
    // é mais seguro desassociar ou deletar registros relacionados primeiro.
    // Neste caso, vamos apenas deletar o cliente se ele não tiver ordens ou dívidas.
    const branchScope = await getCurrentBranchScope();
    const related = await prisma.customer.findFirst({
      where: buildBranchWhere(branchScope, { id }),
      include: { _count: { select: { orders: true, debts: true } } }
    });

    if (!related) {
      return { success: false, message: "Cliente não encontrado para esta filial." };
    }

    if (related?._count.orders || related?._count.debts) {
      return { success: false, message: "Este cliente possui pedidos ou dívidas e não pode ser excluído." };
    }

    await prisma.customer.delete({ where: { id: related.id } });
    revalidatePath('/dashboard/clientes');
    return { success: true, message: "Cliente excluído com sucesso." };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Ocorreu um erro ao excluir o cliente." };
  }
}

const ITEMS_PER_PAGE = 10;

export type CustomerSortKey = 'name' | 'city' | 'lastPurchase' | 'daysSinceLastPurchase';
export type SortDirection = 'asc' | 'desc';

const customerSortKeys: CustomerSortKey[] = [
    'name',
    'city',
    'lastPurchase',
    'daysSinceLastPurchase',
];

type CustomerWithRelations = Awaited<ReturnType<typeof prisma.customer.findMany>>[number] & {
    orders: Array<{ createdAt: Date }>;
    _count: { orders: number };
    debts: Array<{ value: number }>;
};

function normalizeText(value: string | null | undefined) {
    return normalizeSearchText(value);
}

function onlyDigits(value: string | null | undefined) {
    return getContactDigits(value);
}

function customerMatchesSearch(customer: CustomerWithRelations, query: string) {
    const term = normalizeText(query);
    const digits = onlyDigits(query);
    const cleanedCustomer = cleanCustomerTextFields(customer);

    if (!term && !digits) {
        return true;
    }

    const textFields = [
        cleanedCustomer.name,
        cleanedCustomer.phone,
        cleanedCustomer.city,
        cleanedCustomer.neighborhood,
        cleanedCustomer.street,
        cleanedCustomer.reference,
    ].map(normalizeText);

    const textMatch = textFields.some((field) => field.includes(term));
    const phoneDigits = onlyDigits(cleanedCustomer.phone);
    const phoneMatch = Boolean(digits) && phoneDigits.includes(digits);

    return textMatch || phoneMatch;
}

function enhanceCustomer(customer: CustomerWithRelations) {
    const cleanedCustomer = cleanCustomerTextFields(customer);
    const lastPurchase = customer.orders[0]?.createdAt;
    const daysSinceLastPurchase = lastPurchase
        ? Math.floor((new Date().getTime() - new Date(lastPurchase).getTime()) / (1000 * 60 * 60 * 24))
        : null;
    const totalDebt = customer.debts.reduce((sum, debt) => sum + debt.value, 0);

    return {
        ...cleanedCustomer,
        lastPurchase,
        daysSinceLastPurchase,
        totalOrders: customer._count.orders,
        totalDebt,
    };
}

type EnhancedCustomer = ReturnType<typeof enhanceCustomer>;

function normalizeSortKey(sort?: string): CustomerSortKey {
    return customerSortKeys.includes(sort as CustomerSortKey)
        ? (sort as CustomerSortKey)
        : 'lastPurchase';
}

function normalizeSortDirection(direction?: string): SortDirection {
    return direction === 'asc' ? 'asc' : 'desc';
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

function compareCustomers(
    left: EnhancedCustomer,
    right: EnhancedCustomer,
    sort: CustomerSortKey,
    direction: SortDirection,
) {
    if (sort === 'name') {
        const result = left.name.localeCompare(right.name, 'pt-BR', { sensitivity: 'base' });
        return direction === 'asc' ? result : -result;
    }

    if (sort === 'city') {
        const result = left.city.localeCompare(right.city, 'pt-BR', { sensitivity: 'base' });
        return direction === 'asc' ? result : -result;
    }

    if (sort === 'daysSinceLastPurchase') {
        return compareNullableNumber(left.daysSinceLastPurchase, right.daysSinceLastPurchase, direction);
    }

    return compareNullableNumber(
        left.lastPurchase ? left.lastPurchase.getTime() : null,
        right.lastPurchase ? right.lastPurchase.getTime() : null,
        direction,
    );
}

export async function getPaginatedCustomers(
    query: string,
    currentPage: number,
    sort?: string,
    direction?: string,
) {
    const offset = (currentPage - 1) * ITEMS_PER_PAGE;
    const normalizedQuery = query.trim();
    const sortKey = normalizeSortKey(sort);
    const sortDirection = normalizeSortDirection(direction);

    try {
        const branchScope = await getCurrentBranchScope();
        const include = {
            orders: {
                orderBy: { createdAt: 'desc' as const },
                take: 1,
            },
            _count: {
                select: { orders: true },
            },
            debts: {
                where: { status: { in: [...OPEN_DEBT_STATUSES] } },
            },
        };

        const allCustomers = await prisma.customer.findMany({
            where: buildBranchWhere(branchScope),
            include,
            orderBy: { name: 'asc' },
        });

        const filteredCustomers = normalizedQuery
            ? allCustomers.filter((customer) => customerMatchesSearch(customer, normalizedQuery))
            : allCustomers;

        const sortedCustomers = filteredCustomers
            .map(enhanceCustomer)
            .sort((left, right) => {
                const result = compareCustomers(left, right, sortKey, sortDirection);

                if (result !== 0) {
                    return result;
                }

                return left.name.localeCompare(right.name, 'pt-BR', { sensitivity: 'base' });
            });

        return {
            customers: sortedCustomers.slice(offset, offset + ITEMS_PER_PAGE),
            totalPages: Math.ceil(sortedCustomers.length / ITEMS_PER_PAGE),
        };
    } catch (err) {
        console.error('Database Error:', err);
        throw new Error('Falha ao buscar clientes.');
    }
}
export async function getCustomerById(id: string) {
  try {
    const branchScope = await getCurrentBranchScope();
    const customer = await prisma.customer.findFirst({ where: buildBranchWhere(branchScope, { id }) });
    return customer ? cleanCustomerTextFields(customer) : customer;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Falha ao buscar cliente.');
  }
}

type ImportCustomersState = {
  success: boolean;
  message: string;
};

type ImportedCustomer = {
  name: string;
  phone: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  reference: string;
};

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
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function pickValue(row: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value.trim()) {
      return decodeContactText(value.trim());
    }
  }

  return '';
}

function decodeContactText(value: string) {
  return decodeImportedContactText(value);
}

function pickPhoneValue(row: Record<string, string>) {
  const directValue = pickValue(row, [
    'telefone',
    'phone',
    'whatsapp',
    'celular',
    'fone',
    'mobile',
    'mobile phone',
    'phone 1 - value',
    'phone 2 - value',
    'phone 3 - value',
    'telefone 1 - valor',
    'telefone 2 - valor',
    'telefone 3 - valor',
  ]);

  if (directValue) {
    return directValue;
  }

  const phoneEntry = Object.entries(row).find(([header, value]) => {
    const normalizedHeader = normalizeHeader(header);
    return (
      value.trim() &&
      (normalizedHeader.includes('phone') ||
        normalizedHeader.includes('telefone') ||
        normalizedHeader.includes('celular') ||
        normalizedHeader.includes('mobile') ||
        normalizedHeader.includes('whatsapp'))
    );
  });

  return phoneEntry?.[1]?.trim() ?? '';
}

function normalizeImportedPhone(value: string) {
  return normalizeImportedPhoneValue(value);
}

function getPhoneDigits(value: string) {
  return getContactDigits(value);
}

function detectDelimiter(headerLine: string) {
  const candidates = [';', ',', '\t'];
  return candidates
    .map((delimiter) => ({
      delimiter,
      count: splitCsvLine(headerLine, delimiter).length,
    }))
    .sort((a, b) => b.count - a.count)[0]?.delimiter ?? ',';
}

function buildNameFromRow(row: Record<string, string>) {
  const fullName = pickValue(row, [
    'nome',
    'name',
    'cliente',
    'customer',
    'display name',
    'full name',
    'nome completo',
  ]);

  if (fullName) {
    return fullName;
  }

  return [
    pickValue(row, ['given name', 'first name', 'primeiro nome', 'nome']),
    pickValue(row, ['middle name', 'nome do meio']),
    pickValue(row, ['family name', 'last name', 'sobrenome']),
  ]
    .filter(Boolean)
    .join(' ')
    .trim();
}

function parseCustomersCsv(text: string): ImportedCustomer[] {
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
      row[header] = decodeContactText(values[index] ?? '');
    });

    const name = buildNameFromRow(row);
    const phone = normalizeImportedPhone(pickPhoneValue(row));
    const notes = pickValue(row, ['notes', 'observacoes', 'observacao', 'nota']);
    const address = pickValue(row, ['address 1 - street', 'address', 'endereco completo']);

    return {
      name,
      phone,
      cep: pickValue(row, ['cep', 'postal code', 'address 1 - postal code']),
      street: pickValue(row, ['rua', 'street', 'endereco', 'logradouro', 'address 1 - street']) || address,
      number: pickValue(row, ['numero', 'number', 'n', 'num']) || 'S/N',
      complement: pickValue(row, ['complemento', 'complement']),
      neighborhood: pickValue(row, ['bairro', 'neighborhood']),
      city: pickValue(row, ['cidade', 'city', 'address 1 - city']) || 'Lavras',
      reference: pickValue(row, ['referencia', 'reference', 'ponto de referencia']) || notes,
    };
  }).filter((customer) => customer.name && customer.phone);
}

function decodeVcardValue(value: string) {
  return decodeContactText(value);
}

function parseCustomersVcf(text: string): ImportedCustomer[] {
  const cleanText = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n[ \t]/g, '');
  const cards = cleanText.split(/BEGIN:VCARD/i).slice(1);

  return cards
    .map((card) => {
      const lines = card.split('\n').map((line) => line.trim()).filter(Boolean);
      const fullNameLine = lines.find((line) => /^FN[:;]/i.test(line));
      const nameLine = lines.find((line) => /^N[:;]/i.test(line));
      const phoneLine = lines.find((line) => /^TEL[:;]/i.test(line));
      const addressLine = lines.find((line) => /^ADR[:;]/i.test(line));
      const noteLine = lines.find((line) => /^NOTE[:;]/i.test(line));

      const fullName = fullNameLine ? decodeVcardValue(fullNameLine.split(':').slice(1).join(':')) : '';
      const structuredName = nameLine ? nameLine.split(':').slice(1).join(':').split(';').filter(Boolean).reverse().join(' ') : '';
      const phone = phoneLine ? normalizeImportedPhone(decodeVcardValue(phoneLine.split(':').slice(1).join(':'))) : '';
      const addressParts = addressLine
        ? addressLine.split(':').slice(1).join(':').split(';').map(decodeVcardValue).filter(Boolean)
        : [];

      return {
        name: fullName || structuredName,
        phone,
        cep: '',
        street: addressParts.join(' '),
        number: 'S/N',
        complement: '',
        neighborhood: '',
        city: 'Lavras',
        reference: noteLine ? decodeVcardValue(noteLine.split(':').slice(1).join(':')) : '',
      };
    })
    .filter((customer) => customer.name && customer.phone);
}

function parseCustomersFile(text: string, fileName: string) {
  const lowerName = fileName.toLowerCase();
  const looksLikeVcard = /BEGIN:VCARD/i.test(text) || lowerName.endsWith('.vcf');

  if (looksLikeVcard) {
    return parseCustomersVcf(text);
  }

  return parseCustomersCsv(text);
}

export async function importCustomers(
  _prevState: ImportCustomersState,
  formData: FormData
): Promise<ImportCustomersState> {
  const denied = await requireActionAccess(['ADMIN', 'VENDEDOR']);
  if (denied) return denied;

  const file = formData.get('file');

  if (!(file instanceof File) || file.size === 0) {
    return { success: false, message: 'Selecione uma planilha CSV para importar.' };
  }

  const lowerFileName = file.name.toLowerCase();
  const isAllowedFile =
    lowerFileName.endsWith('.csv') ||
    lowerFileName.endsWith('.cdsv') ||
    lowerFileName.endsWith('.vcf') ||
    lowerFileName.endsWith('.txt');

  if (!isAllowedFile) {
    return { success: false, message: 'Importe um arquivo CSV, VCF ou o arquivo de contatos exportado pelo Android.' };
  }

  try {
    const text = await file.text();
    const customers = parseCustomersFile(text, file.name);

    if (customers.length === 0) {
      return {
        success: false,
        message: 'Nenhum cliente válido encontrado. O arquivo precisa ter nome e telefone/celular.',
      };
    }

    let created = 0;
    let updated = 0;
    const branchScope = await getCurrentBranchScope();
    const existingCustomers = await prisma.customer.findMany({
      where: buildBranchWhere(branchScope),
      select: { id: true, phone: true },
    });
    const existingByPhoneDigits = new Map(
      existingCustomers
        .map((customer) => [getPhoneDigits(customer.phone), customer.id] as const)
        .filter(([digits]) => digits.length >= 8)
    );
    const importedPhones = new Set<string>();

    for (const customer of customers) {
      const phoneDigits = getPhoneDigits(customer.phone);

      if (phoneDigits.length < 8 || importedPhones.has(phoneDigits)) {
        continue;
      }

      importedPhones.add(phoneDigits);
      const existingId = existingByPhoneDigits.get(phoneDigits);

      if (existingId) {
        await prisma.customer.update({ where: { id: existingId }, data: customer });
        updated += 1;
      } else {
        const createdCustomer = await prisma.customer.create({
          data: { ...customer, branchId: branchScope.branchId },
        });
        existingByPhoneDigits.set(phoneDigits, createdCustomer.id);
        created += 1;
      }
    }

    revalidatePath('/dashboard/clientes');

    return {
      success: true,
      message: `Importação concluída: ${created} criado(s) e ${updated} atualizado(s).`,
    };
  } catch (error) {
    console.error(error);
    return { success: false, message: 'Erro ao importar clientes.' };
  }
}
