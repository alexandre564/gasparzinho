import { notFound } from 'next/navigation';

import { EditForm } from './EditForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { prisma } from '@/lib/prisma';
import { buildBranchWhere } from '@/lib/branch-scope';
import { getCurrentBranchScope } from '@/lib/current-branch-scope';
import type { User } from '@/types';


export const dynamic = 'force-dynamic';
export default async function EditUserPage({ params }: { params: { id: string } }) {
  const branchScope = await getCurrentBranchScope();
  const user = await prisma.user.findFirst({
    where: buildBranchWhere(branchScope, { id: params.id }),
  });

  if (!user) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card className="border-slate-300">
        <CardHeader className="border-b border-slate-200 bg-slate-50">
          <CardTitle className="text-2xl font-extrabold text-slate-950">Editar membro</CardTitle>
          <CardDescription>
            Atualize nome, email de login, senha, situação e nível de acesso deste membro da equipe.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <EditForm user={user as User} />
        </CardContent>
      </Card>
    </div>
  );
}
