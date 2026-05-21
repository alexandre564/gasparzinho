import Link from 'next/link';

import { columns } from './columns';
import { DataTable } from './data-table';
import { getTeamMembers } from './actions';
import { Button } from '@/components/ui/button';

export default async function TeamPage() {
  const members = await getTeamMembers();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-lg border border-slate-800 bg-slate-950 p-6 text-white shadow-xl shadow-slate-300/60 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-emerald-300">Equipe</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Membros e acessos</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            Altere dados dos membros e defina quem atua como administrador, vendedor ou entregador.
          </p>
        </div>
        <Button asChild className="bg-emerald-500 hover:bg-emerald-400">
          <Link href="/dashboard/equipe/novo">Adicionar membro</Link>
        </Button>
      </div>

      <DataTable columns={columns} data={members} />
    </div>
  );
}
