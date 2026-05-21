'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const DebtStatus = { PENDENTE: 'PENDENTE', PAGO: 'PAGO', VENCIDO: 'VENCIDO', CANCELADA: 'CANCELADA' } as const;

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
  try {
    // Para evitar erros de deleção por restrições de chave estrangeira, 
    // é mais seguro desassociar ou deletar registros relacionados primeiro.
    // Neste caso, vamos apenas deletar o cliente se ele não tiver ordens ou dívidas.
    const related = await prisma.customer.findUnique({
      where: { id },
      include: { _count: { select: { orders: true, debts: true } } }
    });

    if (related?._count.orders || related?._count.debts) {
      return { success: false, message: "Este cliente possui pedidos ou dívidas e não pode ser excluído." };
    }

    await prisma.customer.delete({ where: { id } });
    revalidatePath('/dashboard/clientes');
    return { success: true, message: "Cliente excluído com sucesso." };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Ocorreu um erro ao excluir o cliente." };
  }
}

const ITEMS_PER_PAGE = 10;

type CustomerWithRelations = Awaited<ReturnType<typeof prisma.customer.findMany>>[number] & {
    orders: Array<{ createdAt: Date }>;
    _count: { orders: number };
    debts: Array<{ value: number }>;
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

function customerMatchesSearch(customer: CustomerWithRelations, query: string) {
    const term = normalizeText(query);
    const digits = onlyDigits(query);

    if (!term && !digits) {
        return true;
    }

    const textFields = [
        customer.name,
        customer.phone,
        customer.city,
        customer.neighborhood,
        customer.street,
        customer.reference,
    ].map(normalizeText);

    const textMatch = textFields.some((field) => field.includes(term));
    const phoneDigits = onlyDigits(customer.phone);
    const phoneMatch = Boolean(digits) && phoneDigits.includes(digits);

    return textMatch || phoneMatch;
}

function enhanceCustomer(customer: CustomerWithRelations) {
    const lastPurchase = customer.orders[0]?.createdAt;
    const daysSinceLastPurchase = lastPurchase
        ? Math.floor((new Date().getTime() - new Date(lastPurchase).getTime()) / (1000 * 60 * 60 * 24))
        : null;
    const totalDebt = customer.debts.reduce((sum, debt) => sum + debt.value, 0);

    return {
        ...customer,
        lastPurchase,
        daysSinceLastPurchase,
        totalOrders: customer._count.orders,
        totalDebt,
    };
}

export async function getPaginatedCustomers(query: string, currentPage: number) {
    const offset = (currentPage - 1) * ITEMS_PER_PAGE;
    const normalizedQuery = query.trim();

    try {
        const include = {
            orders: {
                orderBy: { createdAt: 'desc' as const },
                take: 1,
            },
            _count: {
                select: { orders: true },
            },
            debts: {
                where: { status: { in: [DebtStatus.PENDENTE, DebtStatus.VENCIDO] } },
            },
        };

        if (normalizedQuery) {
            const allCustomers = await prisma.customer.findMany({
                include,
                orderBy: { name: 'asc' },
            });

            const filteredCustomers = allCustomers.filter((customer) =>
                customerMatchesSearch(customer, normalizedQuery)
            );

            return {
                customers: filteredCustomers.slice(offset, offset + ITEMS_PER_PAGE).map(enhanceCustomer),
                totalPages: Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE),
            };
        }

        const [customers, count] = await Promise.all([
            prisma.customer.findMany({
                include,
                orderBy: { name: 'asc' },
                take: ITEMS_PER_PAGE,
                skip: offset,
            }),
            prisma.customer.count(),
        ]);

        return {
            customers: customers.map(enhanceCustomer),
            totalPages: Math.ceil(count / ITEMS_PER_PAGE),
        };
    } catch (err) {
        console.error('Database Error:', err);
        throw new Error('Failed to fetch customers.');
    }
}
export async function getCustomerById(id: string) {
  try {
    const customer = await prisma.customer.findUnique({ where: { id } });
    return customer;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch customer.');
  }
}

type ImportCustomersState = {
  success: boolean;
  message: string;
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
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
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

function parseCustomersCsv(text: string) {
  const cleanText = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rawLines = cleanText.split('\n').map((line) => line.trim()).filter(Boolean);
  const lines = rawLines[0]?.toLowerCase().startsWith('sep=') ? rawLines.slice(1) : rawLines;

  if (lines.length < 2) {
    return [];
  }

  const delimiter = lines[0].includes(';') ? ';' : ',';
  const headers = splitCsvLine(lines[0], delimiter).map(normalizeHeader);

  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line, delimiter);
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });

    return {
      name: pickValue(row, ['nome', 'name', 'cliente', 'customer']),
      phone: pickValue(row, ['telefone', 'phone', 'whatsapp', 'celular', 'fone']),
      cep: pickValue(row, ['cep']),
      street: pickValue(row, ['rua', 'street', 'endereco', 'logradouro']),
      number: pickValue(row, ['numero', 'number', 'n', 'num']) || 'S/N',
      complement: pickValue(row, ['complemento', 'complement']),
      neighborhood: pickValue(row, ['bairro', 'neighborhood']),
      city: pickValue(row, ['cidade', 'city']) || 'Lavras',
      reference: pickValue(row, ['referencia', 'reference', 'ponto de referencia']),
    };
  }).filter((customer) => customer.name && customer.phone);
}

export async function importCustomers(
  _prevState: ImportCustomersState,
  formData: FormData
): Promise<ImportCustomersState> {
  const file = formData.get('file');

  if (!(file instanceof File) || file.size === 0) {
    return { success: false, message: 'Selecione uma planilha CSV para importar.' };
  }

  if (!file.name.toLowerCase().endsWith('.csv')) {
    return { success: false, message: 'Por enquanto, importe um arquivo CSV.' };
  }

  try {
    const text = await file.text();
    const customers = parseCustomersCsv(text);

    if (customers.length === 0) {
      return {
        success: false,
        message: 'Nenhum cliente valido encontrado. Use colunas como nome e telefone.',
      };
    }

    let created = 0;
    let updated = 0;

    for (const customer of customers) {
      const existing = await prisma.customer.findUnique({ where: { phone: customer.phone } });

      if (existing) {
        await prisma.customer.update({ where: { id: existing.id }, data: customer });
        updated += 1;
      } else {
        await prisma.customer.create({ data: customer });
        created += 1;
      }
    }

    revalidatePath('/dashboard/clientes');

    return {
      success: true,
      message: `Importacao concluida: ${created} criado(s) e ${updated} atualizado(s).`,
    };
  } catch (error) {
    console.error(error);
    return { success: false, message: 'Erro ao importar clientes.' };
  }
}