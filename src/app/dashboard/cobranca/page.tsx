import Link from 'next/link';
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
  daysLate: 'Dias atraso',
  status: 'Status',
  paidAt: 'Pagamento',
};

const formatDate = (date?: Date | null) => (date ? format(date, 'dd/MM/yyyy') : '-');
const formatPhoneForWhatsApp = (phone: string) => phone.replace(/\D/g, '');

function normalizeSort(sort?: string): DebtSortKey {
  if (
    sort === 'customer' ||
    sort === 'phone' ||
    sort === 'value' ||
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
  searchParams: { query?: string };
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

  params.set('page', '1');
  params.set('sort', field);
  params.set('direction', nextDirection);

  const Icon = isActive ? (activeDirection === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <TableHead className={className}>
      <Link
        href={`/dashboard/cobranca?${params.toString()}`}
        className="inline-flex items-center gap-1.5 rounded px-1 py-1 font-extrabold text-slate-950 transition-colors hover:bg-emerald-50 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        aria-label={`Ordenar por ${sortLabels[field]}`}
        title={`Ordenar por ${sortLabels[field]}`}
      >
        {sortLabels[field]}
        <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-emerald-700' : 'text-slate-500'}`} />
      </Link>
    </TableHead>
  );
}

type DebtListItem = Awaited<ReturnType<typeof getPaginatedDebts>>['debts'][number];

function buildCollectionMessage(template: string, debt: DebtListItem) {
  return encodeURIComponent(
    template
      .replaceAll('{cliente}', debt.customer.name)
      .replaceAll('{valor}', currency.format(debt.paymentValue))
      .replaceAll('{vencimento}', formatDate(debt.dueDate)),
  );
}

function getDelayText(debt: DebtListItem) {
  if (debt.daysLate === 0) {
    return debt.status === 'PAGO' ? 'Pago no prazo' : 'Sem atraso';
  }

  return debt.status === 'PAGO'
    ? `${debt.daysLate} dia(s) em atraso`
    : `${debt.daysLate} dia(s) atrasado`;
}

export default async function CobrancaPage({
  searchParams,
}: {
  searchParams?: { query?: string; page?: string; sort?: string; direction?: string };
}) {
  const query = searchParams?.query ?? '';
  const currentPage = Number(searchParams?.page) || 1;
  const sort = normalizeSort(searchParams?.sort);
  const direction = normalizeDirection(searchParams?.direction);
  const [{ debts, totalPages, totalDebts }, messageTemplate] = await Promise.all([
    getPaginatedDebts(query, currentPage, sort, direction),
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
              <a href="/api/cobranca/exportar" download>
                <Download className="h-4 w-4" />
                Exportar Excel
              </a>
            </Button>
            <ImportDebtsButton />
          </div>
        </div>
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <Search placeholder="Buscar por cliente, telefone, status ou observação..." />
          <span className="text-sm font-semibold text-slate-600">
            {totalDebts} registro(s) de cobrança
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <SortableHeader
                  field="customer"
                  activeSort={sort}
                  activeDirection={direction}
                  searchParams={searchParams ?? {}}
                />
                <SortableHeader
                  field="phone"
                  activeSort={sort}
                  activeDirection={direction}
                  searchParams={searchParams ?? {}}
                  className="hidden md:table-cell"
                />
                <SortableHeader
                  field="value"
                  activeSort={sort}
                  activeDirection={direction}
                  searchParams={searchParams ?? {}}
                  className="text-right"
                />
                <SortableHeader
                  field="dueDate"
                  activeSort={sort}
                  activeDirection={direction}
                  searchParams={searchParams ?? {}}
                  className="hidden lg:table-cell"
                />
                <SortableHeader
                  field="daysLate"
                  activeSort={sort}
                  activeDirection={direction}
                  searchParams={searchParams ?? {}}
                  className="hidden lg:table-cell"
                />
                <TableHead className="hidden xl:table-cell">Renegociação</TableHead>
                <SortableHeader
                  field="paidAt"
                  activeSort={sort}
                  activeDirection={direction}
                  searchParams={searchParams ?? {}}
                  className="hidden xl:table-cell"
                />
                <SortableHeader
                  field="status"
                  activeSort={sort}
                  activeDirection={direction}
                  searchParams={searchParams ?? {}}
                />
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {debts.length > 0 ? (
                debts.map((debt) => {
                  const isRenegotiated = Boolean(debt.renegotiatedAt) || debt.status === 'RENEGOCIADO';
                  const originalDueDate =
                    debt.originalDueDate && debt.originalDueDate.getTime() !== debt.dueDate.getTime()
                      ? debt.originalDueDate
                      : null;

                  return (
                    <TableRow key={debt.id} className={debt.status === 'PAGO' ? 'bg-emerald-50/50' : undefined}>
                      <TableCell>
                        <div className="font-bold text-slate-950">{debt.customer.name}</div>
                        <div className="text-xs text-slate-500">Compra: {formatDate(debt.order?.createdAt ?? debt.createdAt)}</div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{debt.customer.phone}</TableCell>
                      <TableCell className="text-right font-mono font-semibold text-emerald-700">
                        {currency.format(debt.paymentValue)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="font-medium">{formatDate(debt.dueDate)}</div>
                        {originalDueDate ? (
                          <div className="text-xs text-slate-500">Original: {formatDate(originalDueDate)}</div>
                        ) : null}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge variant={debt.daysLate > 0 && debt.status !== 'PAGO' ? 'destructive' : 'secondary'}>
                          {getDelayText(debt)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        {isRenegotiated ? (
                          <div className="space-y-1 text-sm">
                            <div className="font-medium text-amber-700">Sim</div>
                            <div className="text-xs text-slate-600">Em: {formatDate(debt.renegotiatedAt)}</div>
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
                      <TableCell className="hidden xl:table-cell">
                        {debt.paidAt ? (
                          <span className="text-sm font-medium text-emerald-700">{formatDate(debt.paidAt)}</span>
                        ) : (
                          <span className="text-sm text-slate-500">Em aberto</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(debt.status as DebtStatus)}>{debt.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button asChild size="sm" variant="outline" className="gap-2">
                            <Link
                              href={`https://wa.me/55${formatPhoneForWhatsApp(debt.customer.phone)}?text=${buildCollectionMessage(messageTemplate, debt)}`}
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
        <Pagination totalPages={totalPages} />
      </CardContent>
    </Card>
  );
}
