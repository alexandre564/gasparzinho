'use server';

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import type { User } from '@/types';

// Action to fetch all team members
export async function getTeamMembers(): Promise<any[]> {
    try {
        const users = await prisma.user.findMany({
            orderBy: {
                name: 'asc',
            },
        });
        return users as any[];
    } catch (error) {
        console.error("Database Error:", error);
        throw new Error('Failed to fetch team members.');
    }
}

const UserFormSchema = z.object({
    name: z.string().min(3, { message: "O nome deve ter no mínimo 3 caracteres." }),
    email: z.string().email({ message: "Email inválido." }),
    accessLevel: z.string(),
});

// Action to create a new user
export async function createUser(data: Partial<Omit<User, 'id' | 'password'>>) {
    const validatedFields = UserFormSchema.safeParse(data);

    if (!validatedFields.success) {
        return { success: false, message: validatedFields.error.issues.map(e => e.message).join(", ") };
    }

    try {
        const user = await prisma.user.create({
          data: {
                ...validatedFields.data,
                password: 'temporary-password', // TODO: Add password field to form and hash password
            },
        });
        revalidatePath('/dashboard/equipe');
        return { success: true, message: "Usuário criado com sucesso." };
    } catch (error) {
        console.error("Database Error:", error);
        return { success: false, message: "Falha ao criar o usuário no banco de dados." };
    }
}

// Action to update a user
export async function updateUser(id: string, data: Partial<Omit<User, 'id' | 'password'>>) {
    const validatedFields = UserFormSchema.safeParse(data);

    if (!validatedFields.success) {
        return { success: false, message: validatedFields.error.issues.map(e => e.message).join(", ") };
    }

    try {
        await prisma.user.update({
          where: { id },
          data: validatedFields.data,
        });
        revalidatePath('/dashboard/equipe');
        return { success: true, message: "Usuário atualizado com sucesso." };
    } catch (error) {
        console.error("Database Error:", error);
        return { success: false, message: "Falha ao atualizar o usuário no banco de dados." };
    }
}

// Action to delete a user
export async function deleteUser(formData: FormData) {
    const id = formData.get('id') as string;

    if (!id) {
        return { success: false, message: 'ID do usuário não fornecido.' };
    }

    try {
        await prisma.user.delete({
            where: { id },
        });
        revalidatePath('/dashboard/equipe');
        return { success: true, message: 'Usuário excluído com sucesso.' };
    } catch (error) {
        console.error("Database Error:", error);
        return { success: false, message: 'Falha ao excluir o usuário.' };
    }
}

export async function updateUserstring(userId: string, accessLevel: string): Promise<{ success: boolean; message: string; }> {
    try {
        await prisma.user.update({
          where: { id: userId },
            data: {
                accessLevel: accessLevel,
            },
        });
        revalidatePath('/dashboard/equipe');
        return { success: true, message: 'Nível de acesso atualizado com sucesso.' };
    } catch (error) {
        console.error("Database Error:", error);
        return { success: false, message: 'Falha ao atualizar o nível de acesso.' };
    }
}
