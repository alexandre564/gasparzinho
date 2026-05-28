import Link from 'next/link';
import { Download, FileSpreadsheet } from 'lucide-react';

import { columns } from './columns';
import { DataTable } from './data-table';
import { getTeamMembers } from './actions';
import ImportTeamButton from './ImportTeamButton';
import { Button } from '@/components/ui/button';


export const dynamic = 'force-dynamic';
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
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild variant="outline" className="w-full border-white/25 bg-white/10 text-white hover:bg-white/20 sm:w-auto">
            <Link href="/api/equipe/exportar">
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full border-white/25 bg-white/10 text-white hover:bg-white/20 sm:w-auto">
            <Link href="/api/equipe/modelo">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Modelo CSV
            </Link>
          </Button>
          <ImportTeamButton />
          <Button asChild className="w-full bg-emerald-500 hover:bg-emerald-400 sm:w-auto">
            <Link href="/dashboard/equipe/novo">Adicionar membro</Link>
          </Button>
        </div>
      </div>

      <DataTable columns={columns} data={members} />
    </div>
  );
}
