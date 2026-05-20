'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
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

export async function createProduct(values: z.infer<typeof ProductFormSchema>): Promise<ProductFormState> {
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

const ITEMS_PER_PAGE = 10;
export async function getPaginatedProducts(query: string, currentPage: number, category?: string) {
    const offset = (currentPage - 1) * ITEMS_PER_PAGE;

    const where: Prisma.ProductWhereInput = {
        ...(query && { name: { contains: query } }),
        ...(category && { category }),
    };

    try {
        const products = await prisma.product.findMany({
            where,
            orderBy: { name: 'asc' },
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
