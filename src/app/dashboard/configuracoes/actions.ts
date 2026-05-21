'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';

const DEFAULT_COLLECTION_MESSAGE =
  'Olá, {cliente}. Passando para lembrar com tranquilidade que há um valor em aberto de {valor}, com vencimento em {vencimento}. Como podemos facilitar para você regularizar? Se preferir, podemos combinar uma nova data ou uma forma de pagamento mais confortável.';

export async function getCollectionMessageTemplate() {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: 'collection_whatsapp_template' },
  });

  return setting?.value ?? DEFAULT_COLLECTION_MESSAGE;
}

export async function updateCollectionMessageTemplate(
  _previousState: { success: boolean; message: string },
  formData: FormData,
) {
  const value = String(formData.get('collectionMessage') ?? '').trim();

  if (!value) {
    return { success: false, message: 'Informe um texto para o WhatsApp de cobrança.' };
  }

  await prisma.systemSetting.upsert({
    where: { key: 'collection_whatsapp_template' },
    update: { value },
    create: { key: 'collection_whatsapp_template', value },
  });

  revalidatePath('/dashboard/configuracoes');
  revalidatePath('/dashboard/cobranca');

  return { success: true, message: 'Texto de cobrança atualizado.' };
}
