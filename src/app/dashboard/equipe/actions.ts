'use server';

import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import type { User } from '@/types';
import { TEAM_ROLE_VALUES } from './roles';

const UserFormSchema = z.object({
  name: z.string().trim().min(3, { message: 'O nome deve ter no minimo 3 caracteres.' }),
  email: z.string().trim().email({ message: 'Email invalido.' }).transform((email) => email.toLowerCase()),
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

export async function createUser(data: Partial<Omit<User, 'id' | 'password'>>) {
  const validatedFields = UserFormSchema.safeParse(data);

  if (!validatedFields.success) {
    return { success: false, message: validatedFields.error.issues.map((e) => e.message).join(', ') };
  }

  try {
    const hashedPassword = await bcrypt.hash('senha123', 10);

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
    return { success: true, message: 'Usuario criado com sucesso. Senha inicial: senha123.' };
  } catch (error) {
    console.error('Database Error:', error);
    return { success: false, message: 'Falha ao criar o usuario no banco de dados.' };
  }
}

export async function updateUser(id: string, data: Partial<Omit<User, 'id' | 'password'>>) {
  const validatedFields = UserFormSchema.safeParse(data);

  if (!validatedFields.success) {
    return { success: false, message: validatedFields.error.issues.map((e) => e.message).join(', ') };
  }

  try {
    await prisma.user.update({
      where: { id },
      data: {
        name: validatedFields.data.name,
        email: validatedFields.data.email,
        role: validatedFields.data.role,
        accessLevel: validatedFields.data.role,
        isActive: validatedFields.data.isActive,
        ...(validatedFields.data.password
          ? { password: await bcrypt.hash(validatedFields.data.password, 10) }
          : {}),
      },
    });

    revalidatePath('/dashboard/equipe');
    return { success: true, message: 'Usuario atualizado com sucesso.' };
  } catch (error) {
    console.error('Database Error:', error);
    return { success: false, message: 'Falha ao atualizar o usuario no banco de dados.' };
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
    return { success: false, message: 'ID do usuario nao fornecido.' };
  }

  try {
    await prisma.user.delete({ where: { id } });
    revalidatePath('/dashboard/equipe');
    return { success: true, message: 'Usuario excluido com sucesso.' };
  } catch (error) {
    console.error('Database Error:', error);
    return { success: false, message: 'Falha ao excluir o usuario.' };
  }
}

export async function updateUserRole(userId: string, role: string) {
  const parsedRole = z.enum(TEAM_ROLE_VALUES).safeParse(role);

  if (!parsedRole.success) {
    return { success: false, message: 'Nivel de acesso invalido.' };
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
    return { success: true, message: 'Nivel de acesso atualizado com sucesso.' };
  } catch (error) {
    console.error('Database Error:', error);
    return { success: false, message: 'Falha ao atualizar o nivel de acesso.' };
  }
}

export async function updateUserstring(userId: string, role: string) {
  return updateUserRole(userId, role);
}
