'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { requireActionAccess } from '@/lib/api-auth';
import { DEFAULT_ORGANIZATION_ID } from '@/lib/branch-scope';

const branchSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(3),
  tradingName: z.string().trim().optional(),
  document: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  city: z.string().trim().optional(),
  status: z.enum(['ATIVA', 'PAUSADA', 'SUSPENSA', 'CANCELADA']).default('ATIVA'),
  contractStatus: z.enum(['PROPRIA', 'TESTE', 'ALUGADA', 'LICENCIADA', 'SUSPENSA', 'CANCELADA']).default('PROPRIA'),
  planName: z.string().trim().optional(),
  contractDueAt: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

async function ensureDefaultOrganization() {
  return prisma.organization.upsert({
    where: { id: DEFAULT_ORGANIZATION_ID },
    update: {},
    create: {
      id: DEFAULT_ORGANIZATION_ID,
      name: 'Gas',
      status: 'ATIVA',
      notes: 'Organização padrão criada para a operação multifilial.',
    },
  });
}

function normalizeBranchData(formData: FormData) {
  const parsed = branchSchema.safeParse({
    id: String(formData.get('id') ?? '') || undefined,
    name: String(formData.get('name') ?? ''),
    tradingName: String(formData.get('tradingName') ?? '') || undefined,
    document: String(formData.get('document') ?? '') || undefined,
    phone: String(formData.get('phone') ?? '') || undefined,
    city: String(formData.get('city') ?? '') || undefined,
    status: String(formData.get('status') ?? 'ATIVA'),
    contractStatus: String(formData.get('contractStatus') ?? 'PROPRIA'),
    planName: String(formData.get('planName') ?? '') || undefined,
    contractDueAt: String(formData.get('contractDueAt') ?? '') || undefined,
    notes: String(formData.get('notes') ?? '') || undefined,
  });

  if (!parsed.success) {
    return null;
  }

  const { id, contractDueAt, ...data } = parsed.data;
  return {
    id,
    data: {
      ...data,
      contractDueAt: contractDueAt ? new Date(`${contractDueAt}T12:00:00`) : null,
    },
  };
}

export async function createBranch(formData: FormData) {
  const denied = await requireActionAccess(['ADMIN']);
  if (denied) return denied;

  const normalized = normalizeBranchData(formData);
  if (!normalized) {
    return { success: false, message: 'Revise os dados da filial.' };
  }

  await ensureDefaultOrganization();
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
  if (!normalized?.id) {
    return { success: false, message: 'Filial não encontrada.' };
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

  await prisma.branch.update({
    where: { id },
    data: { status },
  });

  revalidatePath('/dashboard/filiais');
  return { success: true, message: 'Status da filial atualizado.' };
}
