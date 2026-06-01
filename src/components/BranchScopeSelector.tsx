import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';

const ACTIVE_BRANCH_COOKIE = 'gas_active_branch_id';

async function setActiveBranch(formData: FormData) {
  'use server';

  const session = await auth();
  if (session?.user?.role?.toUpperCase() !== 'ADMIN') {
    return;
  }

  const branchId = String(formData.get('branchId') ?? 'ALL');

  if (branchId === 'ALL') {
    cookies().delete(ACTIVE_BRANCH_COOKIE);
  } else {
    const branch = await prisma.branch.findUnique({ where: { id: branchId }, select: { id: true } });
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

  try {
    branches = await prisma.branch.findMany({
      where: { status: { not: 'CANCELADA' } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  } catch {
    return null;
  }

  if (branches.length === 0) return null;

  const activeBranchId = cookies().get(ACTIVE_BRANCH_COOKIE)?.value ?? 'ALL';

  return (
    <form action={setActiveBranch} className="hidden items-center gap-2 xl:flex">
      <label className="sr-only" htmlFor="active-branch-id">
        Filial ativa
      </label>
      <select
        id="active-branch-id"
        name="branchId"
        defaultValue={activeBranchId}
        className="h-10 max-w-56 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
      >
        <option value="ALL">Todas as filiais</option>
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name}
          </option>
        ))}
      </select>
      <Button type="submit" variant="outline" size="sm">
        Aplicar
      </Button>
    </form>
  );
}
