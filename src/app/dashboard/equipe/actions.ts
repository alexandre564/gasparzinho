'use server';

import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { requireActionAccess } from '@/lib/api-auth';
import { buildBranchWhere } from '@/lib/branch-scope';
import { getCurrentBranchScope } from '@/lib/current-branch-scope';
import type { User } from '@/types';
import { TEAM_ROLE_VALUES } from './roles';

type UserFormInput = {
  name?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
  password?: string;
};

export type ImportTeamState = {
  success: boolean;
  message: string;
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

function pickValue(row: Record<string, string>, options: string[]) {
  for (const option of options) {
    const value = row[normalizeHeader(option)];
    if (value !== undefined && value.trim() !== '') return value.trim();
  }
  return '';
}

function normalizeRole(value: string) {
  const role = normalizeHeader(value);

  if (role.includes('admin')) return 'ADMIN';
  if (role.includes('entreg')) return 'ENTREGADOR';
  if (role.includes('vend')) return 'VENDEDOR';

  const upperRole = value.trim().toUpperCase();
  return TEAM_ROLE_VALUES.includes(upperRole as (typeof TEAM_ROLE_VALUES)[number])
    ? upperRole
    : 'VENDEDOR';
}

function parseActive(value: string) {
  const normalized = normalizeHeader(value);
  if (!normalized) return true;
  return !['nao', 'não', 'inativo', 'false', '0', 'desativado'].includes(normalized);
}

export async function getTeamMembers(): Promise<User[]> {
  try {
    const branchScope = await getCurrentBranchScope();
    const users = await prisma.user.findMany({
      where: buildBranchWhere(branchScope),
      orderBy: { name: 'asc' },
    });

    return users as User[];
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Falha ao buscar membros da equipe.');
  }
}

export async function createUser(data: UserFormInput) {
  const denied = await requireActionAccess(['ADMIN']);
  if (denied) return denied;

  const validatedFields = UserFormSchema.safeParse(data);

  if (!validatedFields.success) {
    return { success: false, message: validatedFields.error.issues.map((e) => e.message).join(', ') };
  }

  try {
    const branchScope = await getCurrentBranchScope();
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
        branchId: branchScope.branchId,
        organizationId: branchScope.organizationId,
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
  const denied = await requireActionAccess(['ADMIN']);
  if (denied) return denied;

  const validatedFields = UserFormSchema.safeParse(data);

  if (!validatedFields.success) {
    return { success: false, message: validatedFields.error.issues.map((e) => e.message).join(', ') };
  }

  try {
    const branchScope = await getCurrentBranchScope();
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

    const targetUser = await prisma.user.findFirst({
      where: buildBranchWhere(branchScope, { id }),
      select: { id: true },
    });

    if (!targetUser) {
      return { success: false, message: 'Membro não encontrado para esta filial.' };
    }

    const passwordUpdate = validatedFields.data.password
      ? { password: await bcrypt.hash(validatedFields.data.password, 10) }
      : {};

    await prisma.user.update({
      where: { id: targetUser.id },
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

export async function importTeamMembers(
  _previousState: ImportTeamState,
  formData: FormData,
): Promise<ImportTeamState> {
  const denied = await requireActionAccess(['ADMIN']);
  if (denied) return denied;

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
    return { success: false, message: 'A planilha precisa ter cabeçalho e pelo menos um membro.' };
  }

  const dataLines = rawLines[0].toLowerCase().startsWith('sep=') ? rawLines.slice(1) : rawLines;
  const delimiter = rawLines[0].toLowerCase().startsWith('sep=')
    ? rawLines[0].slice(4, 5)
    : detectDelimiter(dataLines[0]);
  const headers = parseCsvLine(dataLines[0], delimiter).map(normalizeHeader);

  let created = 0;
  let updated = 0;
  let ignored = 0;
  const branchScope = await getCurrentBranchScope();

  for (const line of dataLines.slice(1)) {
    const cells = parseCsvLine(line, delimiter);
    const row = headers.reduce<Record<string, string>>((accumulator, header, index) => {
      accumulator[header] = cells[index] ?? '';
      return accumulator;
    }, {});

    const name = pickValue(row, ['nome', 'name']);
    const email = pickValue(row, ['email', 'e mail']).toLowerCase();
    const role = normalizeRole(pickValue(row, ['nivel de acesso', 'nível de acesso', 'perfil', 'role']));
    const isActive = parseActive(pickValue(row, ['situacao', 'situação', 'ativo', 'status']));
    const password = pickValue(row, ['senha', 'password']);

    if (!name || !email || !z.string().email().safeParse(email).success) {
      ignored += 1;
      continue;
    }

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    const passwordUpdate = password ? { password: await bcrypt.hash(password, 10) } : {};

    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          name,
          role,
          accessLevel: role,
          isActive,
          ...passwordUpdate,
        },
      });
      updated += 1;
    } else {
      await prisma.user.create({
        data: {
          name,
          email,
          role,
          accessLevel: role,
          isActive,
          password: await bcrypt.hash(password || 'senha123', 10),
          branchId: branchScope.branchId,
          organizationId: branchScope.organizationId,
        },
      });
      created += 1;
    }
  }

  revalidatePath('/dashboard/equipe');
  revalidatePath('/login');

  if (created + updated === 0) {
    return {
      success: false,
      message: `Nenhum membro foi importado. Verifique nome e e-mail. Linhas ignoradas: ${ignored}.`,
    };
  }

  return {
    success: true,
    message: `${created} membro(s) criado(s), ${updated} atualizado(s). Linhas ignoradas: ${ignored}.`,
  };
}

export async function deleteUser(formData: FormData) {
  const denied = await requireActionAccess(['ADMIN']);
  if (denied) return denied;

  const id = formData.get('id') as string;

  if (!id) {
    return { success: false, message: 'ID do usuário não fornecido.' };
  }

  try {
    const branchScope = await getCurrentBranchScope();
    const deleted = await prisma.user.deleteMany({ where: buildBranchWhere(branchScope, { id }) });
    if (deleted.count === 0) {
      return { success: false, message: 'Usuário não encontrado para esta filial.' };
    }
    revalidatePath('/dashboard/equipe');
    return { success: true, message: 'Usuário excluído com sucesso.' };
  } catch (error) {
    console.error('Database Error:', error);
    return { success: false, message: 'Falha ao excluir o usuário.' };
  }
}

export async function updateUserRole(userId: string, role: string) {
  const denied = await requireActionAccess(['ADMIN']);
  if (denied) return denied;

  const parsedRole = z.enum(TEAM_ROLE_VALUES).safeParse(role);

  if (!parsedRole.success) {
    return { success: false, message: 'Nível de acesso inválido.' };
  }

  try {
    const branchScope = await getCurrentBranchScope();
    const updated = await prisma.user.updateMany({
      where: buildBranchWhere(branchScope, { id: userId }),
      data: {
        role: parsedRole.data,
        accessLevel: parsedRole.data,
      },
    });

    if (updated.count === 0) {
      return { success: false, message: 'Usuário não encontrado para esta filial.' };
    }

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
