'use server';

import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@/types/order-status";
import { revalidatePath } from "next/cache";

/**
 * Atualiza o status de um pedido e, se o status for 'ENTREGUE',
 * ajusta o inventário correspondente e registra o movimento em uma única transação.
 * 
 * @param orderId O ID do pedido a ser atualizado.
 * @param newStatus O novo status do pedido.
 */
export async function updateOrderStatus(orderId: string, newStatus: OrderStatus) {
    try {
        if ((newStatus as string) !== 'ENTREGUE') {
            // Se o status não for 'ENTREGUE', apenas atualiza o pedido
            const updatedOrder = await prisma.order.update({
                where: { id: orderId },
                data: { status: newStatus },
            });
            // Revalida o cache da página de detalhes para mostrar o novo status
            revalidatePath(`/dashboard/vendas/${orderId}`);
            return { success: true, order: updatedOrder };
        }

        // Se o status for 'ENTREGUE', executa a lógica de inventário e pedido em uma transação
        const result = await prisma.$transaction(async (tx) => {
            // 1. Atualiza o status do pedido
            const order = await tx.order.update({
                where: { id: orderId },
                data: { 
                    status: newStatus,
                },
                include: { items: { include: { product: true } } }, // Inclui itens e produtos para saber o que ajustar
            });

            // 2. Itera sobre os itens do pedido para ajustar o estoque e registrar o movimento
            for (const item of order.items) {
                // A lógica de troca se aplica apenas a produtos com controle de vasilhame (CHEIO/VAZIO)
                if (item.product.stockKind === 'CHEIO') {
                    // Atualiza o inventário do produto
                    await tx.product.update({
                        where: { id: item.productId },
                        data: {
                            inventory: { decrement: item.quantity }, // Diminui o estoque do produto vendido
                        },
                    });

                    // Registra o movimento de inventário para a venda
                    await tx.inventoryMovement.create({
                        data: {
                            productId: item.productId,
                            quantity: -item.quantity, // Negativo para saída de estoque
                            type: 'SALE',
                        }
                    });
                }
            }
            return order;
        });

        // 3. Revalida os caches das páginas afetadas
        revalidatePath(`/dashboard/vendas`);
        revalidatePath(`/dashboard/vendas/${orderId}`);
        revalidatePath(`/dashboard`); // Revalida o dashboard principal também

        return { success: true, order: result };

    } catch (error) {
        console.error("Erro ao atualizar status do pedido:", error);
        return { success: false, message: "Falha ao atualizar o pedido e o inventário." };
    }
}