'use client';

import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Download } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TEAM_ROLES } from './roles';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function DataTable<TData, TValue>({ columns, data }: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  });
  const nameFilter = (table.getColumn('name')?.getFilterValue() as string) ?? '';
  const roleFilter = (table.getColumn('role')?.getFilterValue() as string) ?? '';
  const activeFilter = (table.getColumn('isActive')?.getFilterValue() as string) ?? '';
  const exportParams = new URLSearchParams();

  if (nameFilter) exportParams.set('query', nameFilter);
  if (roleFilter && roleFilter !== 'TODOS') exportParams.set('role', roleFilter);
  if (activeFilter && activeFilter !== 'TODOS') exportParams.set('active', activeFilter);

  const exportHref = `/api/equipe/exportar${exportParams.toString() ? `?${exportParams.toString()}` : ''}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border border-slate-300 bg-white p-4 shadow-sm lg:flex-row lg:items-end lg:justify-between">
        <div className="grid w-full gap-3 sm:grid-cols-[minmax(0,1fr)_220px_200px] lg:max-w-4xl">
          <Input
            placeholder="Buscar membro por nome..."
            value={nameFilter}
            onChange={(event) => table.getColumn('name')?.setFilterValue(event.target.value)}
          />
          <label className="flex flex-col gap-1 text-xs font-bold uppercase text-slate-600">
            Acesso
            <select
              value={(table.getColumn('role')?.getFilterValue() as string) ?? 'TODOS'}
              onChange={(event) =>
                table.getColumn('role')?.setFilterValue(
                  event.target.value === 'TODOS' ? '' : event.target.value,
                )
              }
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold normal-case text-slate-900 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
              aria-label="Filtrar equipe por nível de acesso"
            >
              <option value="TODOS">Todos os acessos</option>
              {TEAM_ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold uppercase text-slate-600">
            Situação
            <select
              value={activeFilter || 'TODOS'}
              onChange={(event) =>
                table.getColumn('isActive')?.setFilterValue(
                  event.target.value === 'TODOS' ? '' : event.target.value,
                )
              }
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold normal-case text-slate-900 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
              aria-label="Filtrar equipe por situação"
            >
              <option value="TODOS">Todos</option>
              <option value="true">Ativos</option>
              <option value="false">Inativos</option>
            </select>
          </label>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <p className="text-sm font-semibold text-slate-600">
            {table.getFilteredRowModel().rows.length} de {data.length} membro
            {data.length === 1 ? '' : 's'}
          </p>
          <Button asChild variant="outline" size="sm" className="gap-2">
            <a href={exportHref} download>
              <Download className="h-4 w-4" />
              Exportar filtrado
            </a>
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                Nenhum resultado encontrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Próximo
        </Button>
      </div>
    </div>
  );
}
