'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireActionAccess } from '@/lib/api-auth';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';

const ProductFormSchema = z.object({
  name: z.string().min(3, "O nome deve ter no mínimo 3 caracteres."),
  description: z.string().optional(),
  price: z.coerce.number().positive("O preço de venda deve ser positivo."),
  cost: z.coerce.number().nonnegative("O custo não pode ser negativo."),
  category: z.string().min(1, "Categoria é obrigatória."),
  stockKind: z.string().min(1, "Tipo de estoque é obrigatório."),
  inventory: z.coerce.number().int().nonnegative("O estoque inicial não pode ser negativo.").default(0),
});

export type ProductFormState = {
    success: boolean;
    message: string;
    errors?: z.ZodIssue[];
};

export type ImportProductsState = {
    success: boolean;
    message: string;
};

function normalizeHeader(value: string) {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();
}

function detectDelimiter(line: string) {
    const delimiters = [';', ',', '\t'];
    return delimiters
        .map((delimiter) => ({ delimiter, count: line.split(delimiter).length }))
        .sort((a, b) => b.count - a.count)[0]?.delimiter ?? ';';
}

function parseCsvLine(line: string, delimiter: string) {
    const values: string[] = [];
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
            values.push(current.trim());
            current = '';
            continue;
        }

        current += char;
    }

    values.push(current.trim());
    return values;
}

function parseMoneyValue(value: string) {
    const normalized = value
        .replace(/[^\d,.-]/g, '')
        .replace(/\.(?=\d{3}(?:\D|$))/g, '')
        .replace(',', '.');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
}

function parseInventory(value: string) {
    const parsed = Number.parseInt(value.replace(/[^\d-]/g, ''), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function pickValue(row: Record<string, string>, keys: string[]) {
    for (const key of keys) {
        const value = row[normalizeHeader(key)];
        if (value) {
            return value.trim();
        }
    }

    return '';
}

function normalizeCategory(value: string) {
    const normalized = normalizeHeader(value);
    if (normalized.includes('botij') || normalized.includes('gas')) return 'BOTIJAO';
    if (normalized.includes('agua')) return 'AGUA';
    if (normalized.includes('acessor')) return 'ACESSORIO';
    return value ? value.trim().toUpperCase().replace(/\s+/g, '_') : 'OUTROS';
}

function normalizeStockKind(value: string) {
    const normalized = normalizeHeader(value);
    if (normalized.includes('cheio') || normalized.includes('vazio')) return 'CHEIO_VAZIO';
    return 'UNIDADE';
}

export async function createProduct(values: z.infer<typeof ProductFormSchema>): Promise<ProductFormState> {
    const denied = await requireActionAccess(['ADMIN', 'VENDEDOR']);
    if (denied) return denied;

    const validatedFields = ProductFormSchema.safeParse(values);
    if (!validatedFields.success) {
        return { success: false, message: "Erro de validação", errors: validatedFields.error.issues };
    }

    const { inventory, ...productData } = validatedFields.data;

    try {
        await prisma.$transaction(async (tx) => {
            const product = await tx.product.create({
                data: {
                    ...productData,
                    inventory,
                }
            });

            if (inventory > 0) {
                await tx.inventoryMovement.create({
                    data: {
                        productId: product.id,
                        quantity: inventory,
                        type: 'ENTRADA_INICIAL',
                    }
                });
            }
        });

        revalidatePath('/dashboard/estoque');
        return { success: true, message: 'Produto criado com sucesso!' };
    } catch (error) {
        console.error(error);
        return { success: false, message: 'Erro no banco de dados ao criar o produto.' };
    }
}

export async function updateProduct(id: string, values: z.infer<typeof ProductFormSchema>): Promise<ProductFormState> {
    const denied = await requireActionAccess(['ADMIN', 'VENDEDOR']);
    if (denied) return denied;

    const validatedFields = ProductFormSchema.safeParse(values);
     if (!validatedFields.success) {
        return { success: false, message: "Erro de validação", errors: validatedFields.error.issues };
    }

    const { inventory: newInventory, ...productData } = validatedFields.data;

    try {
        await prisma.$transaction(async (tx) => {
            const product = await tx.product.findUnique({ where: { id } });
            if (!product) throw new Error("Produto não encontrado.");

            const inventoryChange = newInventory - product.inventory;

            await tx.product.update({ where: { id }, data: { ...productData, inventory: newInventory } });

            if (inventoryChange !== 0) {
                 await tx.inventoryMovement.create({
                    data: {
                        productId: id,
                        quantity: inventoryChange,
                        type: 'AJUSTE',
                    }
                });
            }
        });

        revalidatePath('/dashboard/estoque');
        revalidatePath(`/dashboard/estoque/${id}/editar`);
        return { success: true, message: 'Produto atualizado com sucesso!' };
    } catch (error) {
         console.error(error);
        return { success: false, message: 'Erro no banco de dados ao atualizar o produto.' };
    }
}

export async function deleteProduct(id: string): Promise<{ success: boolean; message: string }> {
    const denied = await requireActionAccess(['ADMIN', 'VENDEDOR']);
    if (denied) return denied;

    try {
        const orderItemsCount = await prisma.orderItem.count({ where: { productId: id } });
        if (orderItemsCount > 0) {
            return { success: false, message: "Não é possível excluir o produto, pois ele já está associado a vendas."};
        }

        await prisma.product.delete({ where: { id } });
        revalidatePath('/dashboard/estoque');
        return { success: true, message: 'Produto excluído com sucesso!' };
    } catch (error) {
        console.error(error);
        return { success: false, message: 'Erro ao excluir o produto.' };
    }
}

export async function importProducts(
    _previousState: ImportProductsState,
    formData: FormData,
): Promise<ImportProductsState> {
    const denied = await requireActionAccess(['ADMIN', 'VENDEDOR']);
    if (denied) return denied;

    const file = formData.get('file');

    if (!(file instanceof File) || file.size === 0) {
        return { success: false, message: 'Selecione uma planilha CSV para importar.' };
    }

    const allowed = ['.csv', '.cdsv', '.txt'];
    const fileName = file.name.toLowerCase();

    if (!allowed.some((extension) => fileName.endsWith(extension))) {
        return { success: false, message: 'Importe um arquivo CSV, CDSV ou TXT compatível com Excel.' };
    }

    try {
        const content = await file.text();
        const rawLines = content
            .replace(/^\uFEFF/, '')
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);
        const lines = rawLines[0]?.toLowerCase().startsWith('sep=') ? rawLines.slice(1) : rawLines;

        if (lines.length < 2) {
            return { success: false, message: 'A planilha precisa ter cabeçalho e ao menos uma linha de produto.' };
        }

        const delimiter = detectDelimiter(lines[0]);
        const headers = parseCsvLine(lines[0], delimiter).map(normalizeHeader);
        let created = 0;
        let updated = 0;
        let ignored = 0;

        for (const line of lines.slice(1)) {
            const values = parseCsvLine(line, delimiter);
            const row: Record<string, string> = {};
            headers.forEach((header, index) => {
                row[header] = values[index] ?? '';
            });

            const name = pickValue(row, ['nome', 'produto', 'name']);
            const price = parseMoneyValue(pickValue(row, ['preco venda', 'preço venda', 'preco', 'preço', 'venda', 'price']));
            const cost = parseMoneyValue(pickValue(row, ['custo', 'preco custo', 'preço custo', 'cost']));

            if (!name || price <= 0) {
                ignored += 1;
                continue;
            }

            const inventory = parseInventory(pickValue(row, ['saldo', 'estoque', 'inventory', 'quantidade']));
            const data = {
                name,
                description: pickValue(row, ['descricao', 'descrição', 'description']) || null,
                price,
                cost,
                category: normalizeCategory(pickValue(row, ['categoria', 'category'])),
                stockKind: normalizeStockKind(pickValue(row, ['tipo estoque', 'stock kind', 'stockkind'])),
                inventory,
            };

            const existing = await prisma.product.findUnique({ where: { name } });

            if (existing) {
                const inventoryChange = inventory - existing.inventory;
                await prisma.$transaction(async (tx) => {
                    await tx.product.update({ where: { id: existing.id }, data });

                    if (inventoryChange !== 0) {
                        await tx.inventoryMovement.create({
                            data: {
                                productId: existing.id,
                                quantity: inventoryChange,
                                type: 'IMPORTACAO',
                            },
                        });
                    }
                });
                updated += 1;
                continue;
            }

            await prisma.$transaction(async (tx) => {
                const product = await tx.product.create({ data });

                if (inventory > 0) {
                    await tx.inventoryMovement.create({
                        data: {
                            productId: product.id,
                            quantity: inventory,
                            type: 'IMPORTACAO',
                        },
                    });
                }
            });
            created += 1;
        }

        revalidatePath('/dashboard/estoque');
        revalidatePath('/dashboard/configuracoes');

        return {
            success: true,
            message: `Importação concluída: ${created} produto(s) criado(s), ${updated} atualizado(s) e ${ignored} ignorado(s).`,
        };
    } catch (error) {
        console.error('Erro ao importar produtos:', error);
        return { success: false, message: 'Erro ao importar produtos.' };
    }
}

const ITEMS_PER_PAGE = 10;

export type ProductSortKey = 'name' | 'category' | 'inventory' | 'price' | 'cost';
export type SortDirection = 'asc' | 'desc';

const productSortKeys: ProductSortKey[] = ['name', 'category', 'inventory', 'price', 'cost'];

function normalizeSortKey(sort?: string): ProductSortKey {
    return productSortKeys.includes(sort as ProductSortKey) ? (sort as ProductSortKey) : 'name';
}

function normalizeSortDirection(direction?: string): SortDirection {
    return direction === 'desc' ? 'desc' : 'asc';
}

function buildProductOrderBy(sort: ProductSortKey, direction: SortDirection): Prisma.ProductOrderByWithRelationInput {
    if (sort === 'category') {
        return { category: direction };
    }

    if (sort === 'inventory') {
        return { inventory: direction };
    }

    if (sort === 'price') {
        return { price: direction };
    }

    if (sort === 'cost') {
        return { cost: direction };
    }

    return { name: direction };
}

function getStockFilter(stock?: string): Prisma.IntFilter | undefined {
    switch (stock) {
        case 'SEM_ESTOQUE':
            return { lte: 0 };
        case 'CRITICO':
            return { lte: 5 };
        case 'BAIXO':
            return { gt: 5, lte: 10 };
        case 'DISPONIVEL':
            return { gt: 10 };
        default:
            return undefined;
    }
}

export async function getPaginatedProducts(
    query: string,
    currentPage: number,
    category?: string,
    stock?: string,
    sort?: string,
    direction?: string,
) {
    const offset = (currentPage - 1) * ITEMS_PER_PAGE;
    const trimmedQuery = query.trim();
    const stockFilter = getStockFilter(stock);
    const sortKey = normalizeSortKey(sort);
    const sortDirection = normalizeSortDirection(direction);

    const where: Prisma.ProductWhereInput = {
        ...(trimmedQuery && {
            OR: [
                { name: { contains: trimmedQuery } },
                { description: { contains: trimmedQuery } },
                { category: { contains: trimmedQuery.toUpperCase() } },
            ],
        }),
        ...(category && { category }),
        ...(stockFilter && { inventory: stockFilter }),
    };

    try {
        const products = await prisma.product.findMany({
            where,
            orderBy: buildProductOrderBy(sortKey, sortDirection),
            take: ITEMS_PER_PAGE,
            skip: offset,
        });

        const totalProducts = await prisma.product.count({ where });

        return { products, totalPages: Math.ceil(totalProducts / ITEMS_PER_PAGE) };

    } catch (err) {
        console.error('Database Error:', err);
        throw new Error('Falha ao buscar produtos.');
    }
}

export async function getProductById(id: string) {
    try {
        const product = await prisma.product.findUnique({ where: { id } });
        return product;
    } catch (err) {
        console.error('Database Error:', err);
        throw new Error('Falha ao buscar produto.');
    }
}

export async function getProduct(id: string) {
    try {
        const product = await prisma.product.findUnique({ where: { id } });
        return product;
    } catch (err) {
        console.error('Database Error:', err);
        throw new Error('Falha ao buscar produto.');
    }
}
