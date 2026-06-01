import { auth } from '@/auth';
import { cookies } from 'next/headers';
import { buildBranchWhere, getBranchScopeFromSession } from '@/lib/branch-scope';
import { prisma } from '@/lib/prisma';

const ACTIVE_BRANCH_COOKIE = 'gas_active_branch_id';

export async function getCurrentBranchScope() {
  const session = await auth();
  const scope = getBranchScopeFromSession(session);
  const selectedBranchId = cookies().get(ACTIVE_BRANCH_COOKIE)?.value;

  if (scope.canSeeAllBranches && selectedBranchId && selectedBranchId !== 'ALL') {
    return {
      ...scope,
      branchId: selectedBranchId,
      canSeeAllBranches: false,
    };
  }

  return scope;
}

export async function getCurrentBranchWhere<T extends object>(where?: T) {
  const scope = await getCurrentBranchScope();
  return buildBranchWhere(scope, where);
}

export async function getCurrentBranchDisplayName(fallbackName: string) {
  const session = await auth();
  const scope = getBranchScopeFromSession(session);
  const selectedBranchId = cookies().get(ACTIVE_BRANCH_COOKIE)?.value;
  const branchId = selectedBranchId && selectedBranchId !== 'ALL' ? selectedBranchId : scope.branchId;

  if (!branchId || branchId === 'ALL') {
    return scope.canSeeAllBranches ? 'Todas as filiais' : fallbackName;
  }

  try {
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: { name: true },
    });

    return branch?.name ?? fallbackName;
  } catch {
    return fallbackName;
  }
}
