'use server';

import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import type { User } from '@/types';
import { TEAM_ROLE_VALUES } from './roles';

type UserFormInput = {
  name?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
  password?: string;
};

const UserFormSchema = z.object({
  name: z.string().trim().min(3, { message: 'O nome deve ter no mínimo 3 caracteres.' }),
  email: z.string().trim().email({ message: 'E-mail inválido.' }).transform((email) => email.toLowerCase()),
  role: z.enum(TEAM_ROLE_VALUES),
  isActive: z.boolean().default(true),
  password: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || undefined)
    .pipe(z.string().min(6, { message: 'A senha deve ter pelo menos 6 caracteres.' }).optional()),
});

function normalizeFormData(formData: FormData) {
  const isActiveValue = formData.get('isActive');

  return {
    name: String(formData.get('name') ?? ''),
    email: String(formData.get('email') ?? ''),
    role: String(formData.get('role') ?? ''),
    isActive: isActiveValue === null ? true : isActiveValue === 'true',
    password: String(formData.get('password') ?? ''),
  };
}

export async function getTeamMembers(): Promise<User[]> {
  try {
    const users = await prisma.user.findMany({
      orderBy: { name: 'asc' },
    });

    return users as User[];
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Falha ao buscar membros da equipe.');
  }
}

export async function createUser(data: UserFormInput) {
  const validatedFields = UserFormSchema.safeParse(data);

  if (!validatedFields.success) {
    return { success: false, message: validatedFields.error.issues.map((e) => e.message).join(', ') };
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedFields.data.email },
      select: { id: true },
    });

    if (existingUser) {
      return { success: false, message: 'Já existe um membro com este email.' };
    }

    const hashedPassword = await bcrypt.hash(validatedFields.data.password ?? 'senha123', 10);

    await prisma.user.create({
      data: {
        name: validatedFields.data.name,
        email: validatedFields.data.email,
        role: validatedFields.data.role,
        accessLevel: validatedFields.data.role,
        isActive: validatedFields.data.isActive,
        password: hashedPassword,
      },
    });

    revalidatePath('/dashboard/equipe');
    return {
      success: true,
      message: validatedFields.data.password
        ? 'Usuário criado com sucesso.'
        : 'Usuário criado com sucesso. Senha inicial: senha123.',
    };
  } catch (error) {
    console.error('Database Error:', error);
    return { success: false, message: 'Falha ao criar o usuário no banco de dados.' };
  }
}

export async function updateUser(id: string, data: UserFormInput) {
  const validatedFields = UserFormSchema.safeParse(data);

  if (!validatedFields.success) {
    return { success: false, message: validatedFields.error.issues.map((e) => e.message).join(', ') };
  }

  try {
    const existingUser = await prisma.user.findFirst({
      where: {
        email: validatedFields.data.email,
        NOT: { id },
      },
      select: { id: true },
    });

    if (existingUser) {
      return { success: false, message: 'Este email já está em uso por outro membro.' };
    }

    const passwordUpdate = validatedFields.data.password
      ? { password: await bcrypt.hash(validatedFields.data.password, 10) }
      : {};

    await prisma.user.update({
      where: { id },
      data: {
        name: validatedFields.data.name,
        email: validatedFields.data.email,
        role: validatedFields.data.role,
        accessLevel: validatedFields.data.role,
        isActive: validatedFields.data.isActive,
        ...passwordUpdate,
      },
    });

    revalidatePath('/dashboard/equipe');
    revalidatePath(`/dashboard/equipe/${id}/editar`);
    revalidatePath('/login');

    return {
      success: true,
      message: validatedFields.data.password
        ? 'Usuário, email e senha atualizados com sucesso.'
        : 'Usuário atualizado com sucesso.',
    };
  } catch (error) {
    console.error('Database Error:', error);
    return { success: false, message: 'Falha ao atualizar o usuário no banco de dados.' };
  }
}

export async function createUserFromForm(formData: FormData) {
  return createUser(normalizeFormData(formData));
}

export async function updateUserFromForm(id: string, formData: FormData) {
  return updateUser(id, normalizeFormData(formData));
}

export async function deleteUser(formData: FormData) {
  const id = formData.get('id') as string;

  if (!id) {
    return { success: false, message: 'ID do usuário não fornecido.' };
  }

  try {
    await prisma.user.delete({ where: { id } });
    revalidatePath('/dashboard/equipe');
    return { success: true, message: 'Usuário excluído com sucesso.' };
  } catch (error) {
    console.error('Database Error:', error);
    return { success: false, message: 'Falha ao excluir o usuário.' };
  }
}

export async function updateUserRole(userId: string, role: string) {
  const parsedRole = z.enum(TEAM_ROLE_VALUES).safeParse(role);

  if (!parsedRole.success) {
    return { success: false, message: 'Nível de acesso inválido.' };
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        role: parsedRole.data,
        accessLevel: parsedRole.data,
      },
    });

    revalidatePath('/dashboard/equipe');
    return { success: true, message: 'Nível de acesso atualizado com sucesso.' };
  } catch (error) {
    console.error('Database Error:', error);
    return { success: false, message: 'Falha ao atualizar o nível de acesso.' };
  }
}

export async function updateUserstring(userId: string, role: string) {
  return updateUserRole(userId, role);
}
