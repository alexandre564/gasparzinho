export const DEFAULT_ORGANIZATION_ID = 'org_gas_default';
export const DEFAULT_BRANCH_ID = 'branch_gasparzinho_default';

export type BranchScope = {
  organizationId: string;
  branchId: string;
  canSeeAllBranches: boolean;
};

type SessionLike = {
  user?: {
    role?: string | null;
    organizationId?: string | null;
    branchId?: string | null;
  } | null;
} | null;

export function getFallbackBranchScope(): BranchScope {
  return {
    organizationId: DEFAULT_ORGANIZATION_ID,
    branchId: DEFAULT_BRANCH_ID,
    canSeeAllBranches: true,
  };
}

export function getBranchScopeFromSession(session: SessionLike): BranchScope {
  const fallback = getFallbackBranchScope();
  const user = session?.user;
  const role = user?.role?.toUpperCase();

  return {
    organizationId: user?.organizationId || fallback.organizationId,
    branchId: user?.branchId || fallback.branchId,
    canSeeAllBranches: role === 'ADMIN',
  };
}

export function buildBranchWhere<T extends Record<string, unknown>>(
  scope: BranchScope,
  where?: T,
): T & { branchId?: string } {
  if (scope.canSeeAllBranches) {
    return { ...(where ?? {}) } as T & { branchId?: string };
  }

  return {
    ...(where ?? {}),
    branchId: scope.branchId,
  } as T & { branchId?: string };
}

export function shouldApplyBranchFilter(scope: BranchScope) {
  return !scope.canSeeAllBranches && Boolean(scope.branchId);
}
