import { auth } from '@/auth';
import { buildBranchWhere, getBranchScopeFromSession } from '@/lib/branch-scope';

export async function getCurrentBranchScope() {
  const session = await auth();
  return getBranchScopeFromSession(session);
}

export async function getCurrentBranchWhere<T extends object>(where?: T) {
  const scope = await getCurrentBranchScope();
  return buildBranchWhere(scope, where);
}
