import 'server-only';

import { prisma } from '@/lib/prisma';

export const DEFAULT_BRANCH_NAME = 'Gás Gasparzinho';
export const DEFAULT_BRANCH_NAME_SETTING_KEY = 'defaultBranchName';

const BRANCH_SETTING_TIMEOUT_MS = 2_500;

function withTimeout<T>(promise: Promise<T>, timeoutMs = BRANCH_SETTING_TIMEOUT_MS): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('Tempo limite excedido ao carregar filial padrão.'));
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

export async function getDefaultBranchName() {
  try {
    const setting = await withTimeout(
      prisma.systemSetting.findUnique({
        where: { key: DEFAULT_BRANCH_NAME_SETTING_KEY },
        select: { value: true },
      }),
    );

    const branchName = setting?.value?.trim();
    return branchName || DEFAULT_BRANCH_NAME;
  } catch {
    return DEFAULT_BRANCH_NAME;
  }
}
