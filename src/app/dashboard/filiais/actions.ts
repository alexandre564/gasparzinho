'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { requireActionAccess } from '@/lib/api-auth';
import { DEFAULT_BRANCH_ID, DEFAULT_ORGANIZATION_ID } from '@/lib/branch-scope';

const statusValues = ['ATIVA', 'PAUSADA', 'SUSPENSA', 'CANCELADA'] as const;
const contractStatusValues = ['PROPRIA', 'TESTE', 'ALUGADA', 'LICENCIADA', 'SUSPENSA', 'CANCELADA'] as const;

const branchSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(3, 'Informe um nome com pelo menos 3 caracteres.'),
  tradingName: z.string().trim().optional(),
  document: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  city: z.string().trim().optional(),
  status: z.enum(statusValues).default('ATIVA'),
  contractStatus: z.enum(contractStatusValues).default('PROPRIA'),
  planName: z.string().trim().optional(),
  contractDueAt: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

async function ensureDefaultOrganization() {
  return prisma.organization.upsert({
    where: { id: DEFAULT_ORGANIZATION_ID },
    update: {
      name: 'Gas',
      status: 'ATIVA',
    },
    create: {
      id: DEFAULT_ORGANIZATION_ID,
      name: 'Gas',
      status: 'ATIVA',
      notes: 'Organização padrão criada para a operação multifilial.',
    },
  });
}

function emptyToUndefined(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeOptionalDigits(value?: string) {
  const digits = value?.replace(/\D/g, '');
  return digits || undefined;
}

function normalizeText(value?: string) {
  const normalized = value?.trim().replace(/\s+/g, ' ');
  return normalized || undefined;
}

function parseContractDueAt(value?: string) {
  if (!value) return null;

  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function normalizeBranchData(formData: FormData) {
  const parsed = branchSchema.safeParse({
    id: emptyToUndefined(String(formData.get('id') ?? '')),
    name: String(formData.get('name') ?? ''),
    tradingName: emptyToUndefined(String(formData.get('tradingName') ?? '')),
    document: emptyToUndefined(String(formData.get('document') ?? '')),
    phone: emptyToUndefined(String(formData.get('phone') ?? '')),
    city: emptyToUndefined(String(formData.get('city') ?? '')),
    status: String(formData.get('status') ?? 'ATIVA'),
    contractStatus: String(formData.get('contractStatus') ?? 'PROPRIA'),
    planName: emptyToUndefined(String(formData.get('planName') ?? '')),
    contractDueAt: emptyToUndefined(String(formData.get('contractDueAt') ?? '')),
    notes: emptyToUndefined(String(formData.get('notes') ?? '')),
  });

  if (!parsed.success) {
    return { success: false as const, message: parsed.error.issues[0]?.message || 'Revise os dados da filial.' };
  }

  const { id, contractDueAt, document, phone, name, tradingName, city, planName, notes, ...data } = parsed.data;
  const dueAt = parseContractDueAt(contractDueAt);

  if (dueAt === undefined) {
    return { success: false as const, message: 'Data de vencimento inválida.' };
  }

  return {
    success: true as const,
    id,
    data: {
      ...data,
      name: normalizeText(name) || name,
      tradingName: normalizeText(tradingName),
      city: normalizeText(city),
      planName: normalizeText(planName),
      notes: normalizeText(notes),
      document: normalizeOptionalDigits(document),
      phone: normalizeOptionalDigits(phone),
      contractDueAt: dueAt,
    },
  };
}

async function branchNameExists(name: string, idToIgnore?: string) {
  const existing = await prisma.branch.findFirst({
    where: {
      organizationId: DEFAULT_ORGANIZATION_ID,
      name: { equals: name, mode: 'insensitive' },
      ...(idToIgnore ? { id: { not: idToIgnore } } : {}),
    },
    select: { id: true },
  });

  return Boolean(existing);
}

export async function createBranch(formData: FormData) {
  const denied = await requireActionAccess(['ADMIN']);
  if (denied) return denied;

  const normalized = normalizeBranchData(formData);
  if (!normalized.success) {
    return { success: false, message: normalized.message };
  }

  await ensureDefaultOrganization();

  if (await branchNameExists(normalized.data.name)) {
    return { success: false, message: 'Já existe uma filial com este nome.' };
  }

  await prisma.branch.create({
    data: {
      organizationId: DEFAULT_ORGANIZATION_ID,
      ...normalized.data,
    },
  });

  revalidatePath('/dashboard/filiais');
  return { success: true, message: 'Filial criada com sucesso.' };
}

export async function updateBranch(formData: FormData) {
  const denied = await requireActionAccess(['ADMIN']);
  if (denied) return denied;

  const normalized = normalizeBranchData(formData);
  if (!normalized.success || !normalized.id) {
    return { success: false, message: !normalized.success ? normalized.message : 'Filial não encontrada.' };
  }

  const currentBranch = await prisma.branch.findFirst({
    where: { id: normalized.id, organizationId: DEFAULT_ORGANIZATION_ID },
    select: { id: true },
  });

  if (!currentBranch) {
    return { success: false, message: 'Filial não encontrada nesta organização.' };
  }

  if (normalized.id === DEFAULT_BRANCH_ID && normalized.data.status !== 'ATIVA') {
    return { success: false, message: 'A filial padrao deve permanecer ativa.' };
  }

  if (await branchNameExists(normalized.data.name, normalized.id)) {
    return { success: false, message: 'Já existe outra filial com este nome.' };
  }

  await prisma.branch.update({
    where: { id: normalized.id },
    data: normalized.data,
  });

  revalidatePath('/dashboard/filiais');
  return { success: true, message: 'Filial atualizada com sucesso.' };
}

export async function pauseOrActivateBranch(formData: FormData) {
  const denied = await requireActionAccess(['ADMIN']);
  if (denied) return denied;

  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '') === 'ATIVA' ? 'ATIVA' : 'PAUSADA';

  if (!id) {
    return { success: false, message: 'Filial não encontrada.' };
  }

  if (id === DEFAULT_BRANCH_ID && status !== 'ATIVA') {
    return { success: false, message: 'A filial padrao deve permanecer ativa.' };
  }

  const branch = await prisma.branch.findFirst({
    where: { id, organizationId: DEFAULT_ORGANIZATION_ID },
    select: { id: true },
  });

  if (!branch) {
    return { success: false, message: 'Filial não encontrada nesta organização.' };
  }

  await prisma.branch.update({
    where: { id },
    data: { status },
  });

  revalidatePath('/dashboard/filiais');
  return { success: true, message: 'Status da filial atualizado.' };
}
