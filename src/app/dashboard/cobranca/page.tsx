import Link from 'next/link';
import { Suspense } from 'react';
import { format } from 'date-fns';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  MessageCircle,
  Pencil,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Pagination from '@/components/Pagination';
import { Search } from '@/components/Search';
import { getCollectionMessageTemplate } from '../configuracoes/actions';
import { DebtSortKey, SortDirection, getPaginatedDebts } from './actions';
import ImportDebtsButton from './ImportDebtsButton';
import type { DebtStatus } from '@/types/enums';
import { buildWhatsAppUrl } from '@/lib/whatsapp';
import { debtStatusLabels, labelFrom } from '@/lib/labels';
import { getDebtPaymentBreakdown } from '@/lib/debts';
import StatusFilter from './StatusFilter';

export const dynamic = 'force-dynamic';

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const sortLabels: Record<DebtSortKey, string> = {
  customer: 'Cliente',
  phone: 'Contato',
  value: 'Valor',
  dueDate: 'Vencimento',
  daysLate: 'Dias em Atraso',
  status: 'Status',
  paidAt: 'Pagamento',
};

const formatDate = (date?: Date | null) => (date ? format(date, 'dd/MM/yyyy') : '-');

type OptionalDebtColumn = 'phone' | 'dueDate' | 'daysLate' | 'renegotiation' | 'paidAt';

const optionalDebtColumns: Array<{ key: OptionalDebtColumn; label: string }> = [
  { key: 'phone', label: 'Contato' },
  { key: 'dueDate', label: 'Vencimento' },
  { key: 'daysLate', label: 'Dias em Atraso' },
  { key: 'renegotiation', label: 'Renegociação' },
  { key: 'paidAt', label: 'Pagamento' },
];

function getVisibleColumns(cols?: string) {
  if (!cols) {
    return new Set<OptionalDebtColumn>(optionalDebtColumns.map((column) => column.key));
  }

  const selected = new Set(
    cols
      .split(',')
      .map((column) => column.trim())
      .filter((column): column is OptionalDebtColumn =>
        optionalDebtColumns.some((option) => option.key === column),
      ),
  );

  return selected.size > 0 ? selected : new Set<OptionalDebtColumn>(['phone', 'dueDate', 'daysLate']);
}

function normalizeSort(sort?: string): DebtSortKey {
  if (
    sort === 'customer' ||
    sort === 'phone' ||
    sort === 'value' ||
    sort === 'dueDate' ||
    sort === 'daysLate' ||
    sort === 'status' ||
    sort === 'paidAt'
  ) {
    return sort;
  }

  return 'dueDate';
}

function normalizeDirection(direction?: string): SortDirection {
  return direction === 'desc' ? 'desc' : 'asc';
}

function getDefaultDirection(sort: DebtSortKey): SortDirection {
  return sort === 'value' || sort === 'daysLate' || sort === 'paidAt' ? 'desc' : 'asc';
}

function getStatusVariant(status: DebtStatus) {
  switch (status) {
    case 'VENCIDO':
    case 'OVERDUE':
      return 'destructive' as const;
    case 'PAGO':
      return 'success' as const;
    case 'RENEGOCIADO':
      return 'secondary' as const;
    default:
      return 'default' as const;
  }
}


function SortableHeader({
  field,
  activeSort,
  activeDirection,
  searchParams,
  className = '',
}: {
  field: DebtSortKey;
  activeSort: DebtSortKey;
  activeDirection: SortDirection;
  searchParams: { query?: string; status?: string; cols?: string };
  className?: string;
}) {
  const isActive = activeSort === field;
  const nextDirection = isActive
    ? activeDirection === 'asc'
      ? 'desc'
      : 'asc'
    : getDefaultDirection(field);
  const params = new URLSearchParams();

  if (searchParams.query) {
    params.set('query', searchParams.query);
  }

  if (searchParams.status) {
    params.set('status', searchParams.status);
  }
  if (searchParams.cols) {
    params.set('cols', searchParams.cols);
  }

  params.set('page', '1');
  params.set('sort', field);
  params.set('direction', nextDirection);

  const Icon = isActive ? (activeDirection === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <TableHead className={className}>
      <Link
        href={`/dashboard/cobranca?${params.toString()}`}
        className="inline-flex items-center gap-1.5 rounded px-1 py-1 font-extrabold text-white transition-colors hover:bg-white/10 hover:text-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        aria-label={`Ordenar por ${sortLabels[field]}`}
        title={`Ordenar por ${sortLabels[field]}`}
      >
        {sortLabels[field]}
        <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-emerald-200' : 'text-slate-200'}`} />
      </Link>
    </TableHead>
  );
}

function ColumnControls({
  searchParams,
  visibleColumns,
}: {
  searchParams: { query?: string; status?: string; sort?: string; direction?: string; cols?: string };
  visibleColumns: Set<OptionalDebtColumn>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
      <span className="text-xs font-bold uppercase tracking-wide text-slate-600">Colunas</span>
      {optionalDebtColumns.map((column) => {
        const nextColumns = new Set(visibleColumns);
        if (nextColumns.has(column.key)) {
          nextColumns.delete(column.key);
        } else {
          nextColumns.add(column.key);
        }

        const params = new URLSearchParams();
        if (searchParams.query) params.set('query', searchParams.query);
        if (searchParams.status) params.set('status', searchParams.status);
        if (searchParams.sort) params.set('sort', searchParams.sort);
        if (searchParams.direction) params.set('direction', searchParams.direction);
        params.set('page', '1');
        if (nextColumns.size > 0) params.set('cols', Array.from(nextColumns).join(','));

        const active = visibleColumns.has(column.key);

        return (
          <Button
            key={column.key}
            asChild
            size="sm"
            variant={active ? 'default' : 'outline'}
            className="h-8"
          >
            <Link href={`/dashboard/cobranca?${params.toString()}`} aria-pressed={active}>
              {column.label}
            </Link>
          </Button>
        );
      })}
    </div>
  );
}

type DebtListItem = Awaited<ReturnType<typeof getPaginatedDebts>>['debts'][number];

function buildCollectionMessage(template: string, debt: DebtListItem) {
  return template
    .replaceAll('{cliente}', debt.customer.name)
    .replaceAll('{valor}', currency.format(debt.paymentValue))
    .replaceAll('{vencimento}', formatDate(debt.dueDate));
}

function getDelayText(debt: DebtListItem) {
  if (debt.daysLate === 0) {
    return debt.effectiveStatus === 'PAGO' ? 'Pago no prazo' : 'Sem atraso';
  }

  return debt.effectiveStatus === 'PAGO'
    ? `${debt.daysLate} dia(s) em atraso`
    : `${debt.daysLate} dia(s) atrasado`;
}

export default async function CobrancaPage({
  searchParams,
}: {
  searchParams?: { query?: string; page?: string; sort?: string; direction?: string; status?: string; cols?: string };
}) {
  const query = searchParams?.query ?? '';
  const currentPage = Number(searchParams?.page) || 1;
  const sort = normalizeSort(searchParams?.sort);
  const direction = normalizeDirection(searchParams?.direction);
  const status = searchParams?.status;
  const visibleColumns = getVisibleColumns(searchParams?.cols);
  const showColumn = (column: OptionalDebtColumn) => visibleColumns.has(column);
  const exportParams = new URLSearchParams();

  if (query) exportParams.set('query', query);
  if (status) exportParams.set('status', status);
  exportParams.set('sort', sort);
  exportParams.set('direction', direction);

  const exportHref = `/api/cobranca/exportar${exportParams.toString() ? `?${exportParams.toString()}` : ''}`;
  const [{ debts, totalPages, totalDebts }, messageTemplate] = await Promise.all([
    getPaginatedDebts(query, currentPage, sort, direction, status),
    getCollectionMessageTemplate(),
  ]);

  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <CardTitle>Cobrança</CardTitle>
            <CardDescription>
              Controle todas as compras fiadas, incluindo pagas, renegociadas e em atraso.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="sm" variant="outline" className="gap-2">
              <a href={exportHref} download>
                <Download className="h-4 w-4" />
                Exportar Excel
              </a>
            </Button>
            <Button asChild size="sm" variant="outline" className="gap-2">
              <a href="/api/cobranca/modelo" download>
                <Download className="h-4 w-4" />
                Modelo CSV
              </a>
            </Button>
            <ImportDebtsButton />
          </div>
        </div>
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <Suspense fallback={<div className="h-11 w-full max-w-xl rounded-md border bg-white" />}>
            <Search placeholder="Buscar por cliente, telefone, status ou observação..." />
          </Suspense>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Suspense fallback={<div className="h-11 w-full rounded-md border bg-white sm:w-[210px]" />}>
              <StatusFilter />
            </Suspense>
            <span className="text-sm font-semibold text-slate-600">
              {totalDebts} registro(s) de cobrança
            </span>
          </div>
        </div>
        <ColumnControls searchParams={searchParams ?? {}} visibleColumns={visibleColumns} />
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-md border border-slate-300 bg-white">
          <Table className="min-w-[1120px]">
            <TableHeader>
              <TableRow className="bg-slate-950 hover:bg-slate-950">
                <SortableHeader
                  field="customer"
                  activeSort={sort}
                  activeDirection={direction}
                  searchParams={searchParams ?? {}}
                />
                {showColumn('phone') ? (
                  <SortableHeader
                    field="phone"
                    activeSort={sort}
                    activeDirection={direction}
                    searchParams={searchParams ?? {}}
                    className="hidden md:table-cell"
                  />
                ) : null}
                <SortableHeader
                  field="value"
                  activeSort={sort}
                  activeDirection={direction}
                  searchParams={searchParams ?? {}}
                  className="text-right"
                />
                {showColumn('dueDate') ? (
                  <SortableHeader
                    field="dueDate"
                    activeSort={sort}
                    activeDirection={direction}
                    searchParams={searchParams ?? {}}
                    className="hidden lg:table-cell"
                  />
                ) : null}
                {showColumn('daysLate') ? (
                  <SortableHeader
                    field="daysLate"
                    activeSort={sort}
                    activeDirection={direction}
                    searchParams={searchParams ?? {}}
                    className="hidden lg:table-cell"
                  />
                ) : null}
                {showColumn('renegotiation') ? (
                  <TableHead className="hidden font-extrabold text-white xl:table-cell">Renegociação</TableHead>
                ) : null}
                {showColumn('paidAt') ? (
                  <SortableHeader
                    field="paidAt"
                    activeSort={sort}
                    activeDirection={direction}
                    searchParams={searchParams ?? {}}
                    className="hidden xl:table-cell"
                  />
                ) : null}
                <SortableHeader
                  field="status"
                  activeSort={sort}
                  activeDirection={direction}
                  searchParams={searchParams ?? {}}
                />
                <TableHead className="text-right font-extrabold text-white">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {debts.length > 0 ? (
                debts.map((debt) => {
                  const isRenegotiated = Boolean(debt.renegotiatedAt) || debt.effectiveStatus === 'RENEGOCIADO';
                  const paymentBreakdown = getDebtPaymentBreakdown(debt.notes);
                  const originalDueDate =
                    debt.originalDueDate && debt.originalDueDate.getTime() !== debt.dueDate.getTime()
                      ? debt.originalDueDate
                      : null;

                  return (
                    <TableRow key={debt.id} className={debt.effectiveStatus === 'PAGO' ? 'bg-emerald-50/50' : undefined}>
                      <TableCell>
                        <div className="font-bold text-slate-950">{debt.customer.name}</div>
                        <div className="text-xs text-slate-500">Compra: {formatDate(debt.order?.createdAt ?? debt.createdAt)}</div>
                      </TableCell>
                      {showColumn('phone') ? (
                        <TableCell className="hidden md:table-cell">{debt.customer.phone}</TableCell>
                      ) : null}
                      <TableCell className="text-right font-mono font-semibold text-emerald-700">
                        {currency.format(debt.paymentValue)}
                      </TableCell>
                      {showColumn('dueDate') ? (
                        <TableCell className="hidden lg:table-cell">
                          <div className="font-medium">{formatDate(debt.dueDate)}</div>
                          {originalDueDate ? (
                            <div className="text-xs text-slate-500">Original: {formatDate(originalDueDate)}</div>
                          ) : null}
                        </TableCell>
                      ) : null}
                      {showColumn('daysLate') ? (
                        <TableCell className="hidden lg:table-cell">
                          <Badge variant={debt.daysLate > 0 && debt.effectiveStatus !== 'PAGO' ? 'destructive' : 'secondary'}>
                            {getDelayText(debt)}
                          </Badge>
                          {debt.effectiveStatus !== 'PAGO' && debt.daysLate >= 30 ? (
                            <div className="mt-1 text-xs font-semibold text-red-700">Alerta 30+ dias</div>
                          ) : debt.effectiveStatus !== 'PAGO' && debt.daysLate >= 15 ? (
                            <div className="mt-1 text-xs font-semibold text-amber-700">Alerta 15+ dias</div>
                          ) : debt.effectiveStatus !== 'PAGO' && debt.daysLate >= 7 ? (
                            <div className="mt-1 text-xs font-semibold text-amber-600">Alerta 7+ dias</div>
                          ) : null}
                        </TableCell>
                      ) : null}
                      {showColumn('renegotiation') ? (
                        <TableCell className="hidden xl:table-cell">
                        {isRenegotiated ? (
                          <div className="space-y-1 text-sm">
                            <div className="font-medium text-amber-700">Sim</div>
                            <div className="text-xs text-slate-600">Em: {formatDate(debt.renegotiatedAt)}</div>
                            {paymentBreakdown.paidAmount !== null ? (
                              <div className="text-xs text-slate-700">
                                Pago: {currency.format(paymentBreakdown.paidAmount)}
                              </div>
                            ) : null}
                            {paymentBreakdown.remainingValue !== null ? (
                              <div className="text-xs font-semibold text-slate-800">
                                Restante: {currency.format(paymentBreakdown.remainingValue)}
                              </div>
                            ) : null}
                            {debt.notes ? (
                              <div className="max-w-xs truncate text-xs text-slate-600" title={debt.notes}>
                                {debt.notes}
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-500">Não</span>
                        )}
                        </TableCell>
                      ) : null}
                      {showColumn('paidAt') ? (
                        <TableCell className="hidden xl:table-cell">
                          {debt.paidAt ? (
                            <span className="text-sm font-medium text-emerald-700">{formatDate(debt.paidAt)}</span>
                          ) : (
                            <span className="text-sm text-slate-500">Em aberto</span>
                          )}
                        </TableCell>
                      ) : null}
                      <TableCell>
                        <Badge variant={getStatusVariant(debt.effectiveStatus as DebtStatus)}>
                          {labelFrom(debtStatusLabels, debt.effectiveStatus)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button asChild size="sm" variant="outline" className="gap-2">
                            <Link
                              href={buildWhatsAppUrl(debt.customer.phone, buildCollectionMessage(messageTemplate, debt))}
                              target="_blank"
                              aria-label={`Enviar WhatsApp para ${debt.customer.name}`}
                              title="Enviar WhatsApp"
                            >
                              <MessageCircle className="h-4 w-4" />
                              <span className="hidden 2xl:inline">WhatsApp</span>
                            </Link>
                          </Button>
                          <Button asChild size="sm" className="gap-2">
                            <Link
                              href={`/dashboard/cobranca/${debt.id}`}
                              aria-label={`Editar cobrança de ${debt.customer.name}`}
                              title="Editar cobrança"
                            >
                              <Pencil className="h-4 w-4" />
                              <span className="hidden 2xl:inline">Editar</span>
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="h-32 text-center">
                    <div className="mx-auto max-w-sm space-y-2">
                      <p className="font-medium">Nenhuma cobrança encontrada</p>
                      <p className="text-sm text-muted-foreground">
                        Importe uma planilha ou ajuste os termos da busca.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <Suspense fallback={null}>
          <Pagination totalPages={totalPages} />
        </Suspense>
      </CardContent>
    </Card>
  );
}
