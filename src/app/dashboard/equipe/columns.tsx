'use client';

import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, Pencil } from 'lucide-react';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { User } from '@/types';

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrador',
  VENDEDOR: 'Vendedor',
  ENTREGADOR: 'Entregador',
};

export const columns: ColumnDef<User>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Selecionar todos"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Selecionar linha"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="px-0 text-xs font-extrabold uppercase tracking-wide text-white hover:bg-transparent hover:text-emerald-100"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Nome
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div>
        <p className="font-bold text-slate-950">{row.original.name}</p>
        <p className="text-xs text-slate-600">{row.original.isActive ? 'Ativo' : 'Inativo'}</p>
      </div>
    ),
  },
  {
    accessorKey: 'email',
    header: 'E-mail',
  },
  {
    accessorKey: 'role',
    header: 'Nível de acesso',
    filterFn: (row, id, value) => !value || value === 'TODOS' || row.getValue(id) === value,
    cell: ({ row }) => (
      <Badge variant={row.original.role === 'ADMIN' ? 'default' : 'secondary'}>
        {roleLabels[row.original.role] ?? row.original.role}
      </Badge>
    ),
  },
  {
    accessorKey: 'isActive',
    header: 'Situação',
    filterFn: (row, id, value) => !value || value === 'TODOS' || String(row.getValue(id)) === value,
    cell: ({ row }) => (
      <Badge variant={row.original.isActive ? 'success' : 'outline'}>
        {row.original.isActive ? 'Ativo' : 'Inativo'}
      </Badge>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const user = row.original;

      return (
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-9 gap-2 border-slate-300 bg-white text-slate-800 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700"
                aria-label={`Editar ${user.name}`}
              >
                <Link href={`/dashboard/equipe/${user.id}/editar`}>
                  <Pencil className="h-4 w-4" />
                  <span className="hidden xl:inline">Editar</span>
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Editar membro, login, senha e acesso</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
  },
];
