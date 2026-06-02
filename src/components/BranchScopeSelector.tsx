import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { DEFAULT_ORGANIZATION_ID } from '@/lib/branch-scope';
import { Button } from '@/components/ui/button';

const ACTIVE_BRANCH_COOKIE = 'gas_active_branch_id';

async function setActiveBranch(formData: FormData) {
  'use server';

  const session = await auth();
  if (session?.user?.role?.toUpperCase() !== 'ADMIN') {
    return;
  }

  const branchId = String(formData.get('branchId') ?? 'ALL');
  const organizationId = session.user.organizationId || DEFAULT_ORGANIZATION_ID;

  if (branchId === 'ALL') {
    cookies().delete(ACTIVE_BRANCH_COOKIE);
  } else {
    const branch = await prisma.branch.findFirst({
      where: {
        id: branchId,
        organizationId,
        status: { not: 'CANCELADA' },
      },
      select: { id: true },
    });
    if (!branch) return;

    cookies().set(ACTIVE_BRANCH_COOKIE, branch.id, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  revalidatePath('/dashboard');
}

export async function BranchScopeSelector() {
  const session = await auth();
  const isAdmin = session?.user?.role?.toUpperCase() === 'ADMIN';

  if (!isAdmin) return null;

  let branches: Array<{ id: string; name: string }> = [];
  const organizationId = session?.user?.organizationId || DEFAULT_ORGANIZATION_ID;

  try {
    branches = await prisma.branch.findMany({
      where: {
        organizationId,
        status: { not: 'CANCELADA' },
      },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  } catch {
    return null;
  }

  if (branches.length === 0) return null;

  const activeBranchId = cookies().get(ACTIVE_BRANCH_COOKIE)?.value ?? 'ALL';

  return (
    <form action={setActiveBranch} className="order-last flex w-full items-end gap-2 sm:w-auto lg:order-none">
      <div className="min-w-0 flex-1 sm:w-60 sm:flex-none">
        <label className="mb-1 hidden text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-500 lg:block" htmlFor="active-branch-id">
          Filial
        </label>
        <select
          id="active-branch-id"
          name="branchId"
          defaultValue={activeBranchId}
          className="h-11 min-w-0 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <option value="ALL">Todas as filiais</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" variant="outline" size="sm" className="h-11 shrink-0 rounded-lg border-slate-300 bg-white font-bold">
        Aplicar
      </Button>
    </form>
  );
}
