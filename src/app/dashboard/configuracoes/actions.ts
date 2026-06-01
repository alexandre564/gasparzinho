'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { requireActionAccess } from '@/lib/api-auth';
import { DEFAULT_BRANCH_NAME, DEFAULT_BRANCH_NAME_SETTING_KEY } from '@/lib/branch-settings';

const COLLECTION_MESSAGE_KEY = 'collection_whatsapp_template';
const DRIVER_WHATSAPP_KEY = 'delivery_driver_whatsapp';

const DEFAULT_COLLECTION_MESSAGE =
  'Olá, {cliente}. Passando para lembrar com tranquilidade que há um valor em aberto de {valor}, com vencimento em {vencimento}. Como podemos facilitar para você regularizar? Se preferir, podemos combinar uma nova data ou uma forma de pagamento mais confortável.';

export async function getCollectionMessageTemplate() {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: COLLECTION_MESSAGE_KEY },
  });

  return setting?.value ?? DEFAULT_COLLECTION_MESSAGE;
}

export async function updateCollectionMessageTemplate(
  _previousState: { success: boolean; message: string },
  formData: FormData,
) {
  const denied = await requireActionAccess(['ADMIN']);
  if (denied) return denied;

  const value = String(formData.get('collectionMessage') ?? '').trim();

  if (!value) {
    return { success: false, message: 'Informe um texto para o WhatsApp de cobrança.' };
  }

  await prisma.systemSetting.upsert({
    where: { key: COLLECTION_MESSAGE_KEY },
    update: { value },
    create: { key: COLLECTION_MESSAGE_KEY, value },
  });

  revalidatePath('/dashboard/configuracoes');
  revalidatePath('/dashboard/cobranca');

  return { success: true, message: 'Texto de cobrança atualizado.' };
}

export async function getDriverWhatsappNumber() {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: DRIVER_WHATSAPP_KEY },
  });

  return setting?.value ?? '';
}

export async function updateDriverWhatsappNumber(
  _previousState: { success: boolean; message: string },
  formData: FormData,
) {
  const denied = await requireActionAccess(['ADMIN']);
  if (denied) return denied;

  const rawValue = String(formData.get('driverWhatsapp') ?? '').trim();
  const digits = rawValue.replace(/\D/g, '');

  if (rawValue && digits.length < 10) {
    return { success: false, message: 'Informe um WhatsApp válido para o entregador.' };
  }

  await prisma.systemSetting.upsert({
    where: { key: DRIVER_WHATSAPP_KEY },
    update: { value: digits },
    create: { key: DRIVER_WHATSAPP_KEY, value: digits },
  });

  revalidatePath('/dashboard/configuracoes');
  revalidatePath('/dashboard/entregas');

  return {
    success: true,
    message: rawValue ? 'WhatsApp do entregador atualizado.' : 'WhatsApp do entregador removido.',
  };
}

export async function updateDefaultBranchName(
  _previousState: { success: boolean; message: string },
  formData: FormData,
) {
  const denied = await requireActionAccess(['ADMIN']);
  if (denied) return denied;

  const value = String(formData.get('defaultBranchName') ?? '').trim();

  if (value.length < 3) {
    return { success: false, message: 'Informe um nome de filial com pelo menos 3 caracteres.' };
  }

  await prisma.systemSetting.upsert({
    where: { key: DEFAULT_BRANCH_NAME_SETTING_KEY },
    update: { value },
    create: { key: DEFAULT_BRANCH_NAME_SETTING_KEY, value },
  });

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/configuracoes');

  return {
    success: true,
    message: value === DEFAULT_BRANCH_NAME ? 'Filial padrão restaurada.' : 'Filial padrão atualizada.',
  };
}
