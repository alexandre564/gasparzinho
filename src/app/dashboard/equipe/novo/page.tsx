import { redirect } from 'next/navigation';

import { createUserFromForm } from '../actions';
import { TEAM_ROLES } from '../roles';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';


export const dynamic = 'force-dynamic';
async function createMember(formData: FormData) {
  'use server';

  const result = await createUserFromForm(formData);

  if (result.success) {
    redirect('/dashboard/equipe');
  }
}

export default function NovoMembroPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Card className="border-slate-300">
        <CardHeader className="border-b border-slate-200 bg-slate-50">
          <CardTitle className="text-2xl font-extrabold text-slate-950">Adicionar membro</CardTitle>
          <CardDescription>
            Cadastre um membro da equipe. A senha inicial sera senha123 e podera ser alterada depois.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form action={createMember} className="space-y-5">
            <div className="grid gap-2">
              <label htmlFor="name" className="text-sm font-bold text-slate-800">Nome</label>
              <Input id="name" type="text" name="name" required />
            </div>

            <div className="grid gap-2">
              <label htmlFor="email" className="text-sm font-bold text-slate-800">Email</label>
              <Input id="email" type="email" name="email" required />
            </div>

            <div className="grid gap-2">
              <label htmlFor="role" className="text-sm font-bold text-slate-800">Nível de acesso</label>
              <select
                name="role"
                id="role"
                defaultValue="VENDEDOR"
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-950 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              >
                {TEAM_ROLES.map((role) => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <label htmlFor="isActive" className="text-sm font-bold text-slate-800">Situação</label>
              <select
                name="isActive"
                id="isActive"
                defaultValue="true"
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-950 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
              >
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </div>

            <div className="flex justify-end border-t border-slate-200 pt-5">
              <Button type="submit">Adicionar membro</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
