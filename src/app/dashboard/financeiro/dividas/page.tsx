import Link from 'next/link';
import { Suspense } from 'react';
import { CalendarClock, Download, Loader2, MessageCircle, Pencil } from 'lucide-react';
import type { Debt } from '@prisma/client';
import { getPaginatedDebts, getTotalOpenDebt } from '@/app/dashboard/financeiro/actions';
import { getCollectionMessageTemplate } from '@/app/dashboard/configuracoes/actions';
import type { DebtStatus } from './types';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState, MetricTile, PageHeader, SectionCard } from '@/components/PageShell';
import Pagination from '@/components/Pagination';
import { Search } from '@/components/Search';
import StatusFilter from './StatusFilter';
import MarkAsPaidButton from './MarkAsPaidButton';
import ImportDebtsButton from '../../cobranca/ImportDebtsButton';
import { buildWhatsAppUrl } from '@/lib/whatsapp';
import { debtStatusLabels, labelFrom } from '@/lib/labels';
import { requirePageAccess } from '@/lib/page-auth';
import { calculateDebtDaysLate, getDebtEffectiveStatus, isDebtClosedStatus, isDebtOverdue } from '@/lib/debts';


export const dynamic = 'force-dynamic';
const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const getStatusVariant = (status: string): BadgeProps['variant'] => {
  switch (status) {
    case 'PAGO':
      return 'success';
    case 'PENDENTE':
      return 'default';
    case 'VENCIDO':
      return 'destructive';
    case 'RENEGOCIADO':
    case 'CANCELADA':
      return 'secondary';
    default:
      return 'outline';
  }
};


const formatDate = (date?: Date | null) =>
  date ? new Date(date).toLocaleDateString('pt-BR') : '-';

type DebtWithCustomer = Debt & {
  customer: {
    name: string;
    phone: string;
  };
};

function buildCollectionMessage(template: string, debt: DebtWithCustomer) {
  return template
    .replaceAll('{cliente}', debt.customer.name)
    .replaceAll('{valor}', currency.format(debt.renegotiatedValue ?? debt.value))
    .replaceAll('{vencimento}', formatDate(debt.dueDate));
}

function WhatsAppButton({ debt, template }: { debt: DebtWithCustomer; template: string }) {
  const url = buildWhatsAppUrl(debt.customer.phone, buildCollectionMessage(template, debt));

  return (
    <Button asChild variant="outline" size="sm" className="gap-2">
      <a href={url} target="_blank" rel="noopener noreferrer">
        <MessageCircle className="h-4 w-4" />
        <span className="hidden xl:inline">WhatsApp</span>
      </a>
    </Button>
  );
}

async function TotalOpenDebtCard() {
  const { totalOpen } = await getTotalOpenDebt();

  return (
    <MetricTile
      title="Total em aberto"
      value={currency.format(totalOpen)}
      description="Soma de todas as dívidas pendentes, atrasadas e renegociadas."
      icon={CalendarClock}
      tone="rose"
    />
  );
}

type PageProps = {
  searchParams?: {
    query?: string;
    page?: string;
    status?: string;
  };
};

export default async function Page({ searchParams }: PageProps) {
  await requirePageAccess(['ADMIN']);

  const query = searchParams?.query ?? '';
  const currentPage = Number(searchParams?.page ?? '1');
  const status = searchParams?.status as DebtStatus | undefined;
  const exportParams = new URLSearchParams();

  if (query) exportParams.set('query', query);
  if (status) exportParams.set('status', status);

  const exportHref = `/api/cobranca/exportar${exportParams.toString() ? `?${exportParams.toString()}` : ''}`;

  const [{ debts, totalPages }, messageTemplate] = await Promise.all([
    getPaginatedDebts(query, currentPage, status),
    getCollectionMessageTemplate(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Financeiro"
        title="Gestão de dívidas"
        description="Acompanhe valores em aberto, pagos, renegociações, vencimentos e pagamentos."
        icon={CalendarClock}
        actions={
          <>
          <Button asChild variant="outline" size="sm">
            <a href={exportHref} download>
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href="/api/cobranca/modelo" download>
              Modelo CSV
            </a>
          </Button>
          <ImportDebtsButton />
          </>
        }
      />

      <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin" />}>
        <TotalOpenDebtCard />
      </Suspense>

      <SectionCard title="Dívidas e histórico" description="Busque, cobre, quite ou edite registros de contas a receber.">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Suspense fallback={<div className="h-11 w-full max-w-xl rounded-md border bg-white" />}>
              <Search placeholder="Buscar por cliente, telefone ou status..." />
            </Suspense>
            <Suspense fallback={null}>
              <StatusFilter />
            </Suspense>
          </div>
        <div className="mt-5">
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor para pagamento</TableHead>
                  <TableHead className="hidden text-center md:table-cell">Compra</TableHead>
                  <TableHead className="hidden text-center lg:table-cell">Vencimento</TableHead>
                  <TableHead className="hidden text-center xl:table-cell">Atraso</TableHead>
                  <TableHead className="hidden text-center xl:table-cell">Renegociação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {debts.length > 0 ? (
                debts.map((debt: DebtWithCustomer) => {
                    const effectiveStatus = getDebtEffectiveStatus(debt);
                    const isRenegotiated = Boolean(debt.renegotiatedAt) || debt.status === 'RENEGOCIADO';
                    const lateDays = calculateDebtDaysLate(debt.dueDate, debt.status, debt.paidAt);
                    const overdue = isDebtOverdue(debt);
                    const closed = isDebtClosedStatus(debt.status);

                    return (
                      <TableRow key={debt.id} className={effectiveStatus === 'PAGO' ? 'bg-emerald-50/50' : undefined}>
                        <TableCell>
                          <div className="font-bold text-slate-950">{debt.customer.name}</div>
                          <div className="text-xs text-slate-600">{debt.customer.phone}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(effectiveStatus)}>
                            {labelFrom(debtStatusLabels, effectiveStatus)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-emerald-700">
                          {currency.format(debt.renegotiatedValue ?? debt.value)}
                        </TableCell>
                        <TableCell className="hidden text-center md:table-cell">
                          {formatDate(debt.createdAt)}
                        </TableCell>
                        <TableCell className="hidden text-center lg:table-cell">
                          <div className="font-medium">{formatDate(debt.dueDate)}</div>
                          {debt.originalDueDate && debt.originalDueDate.getTime() !== debt.dueDate.getTime() ? (
                            <div className="text-xs text-slate-500">Original: {formatDate(debt.originalDueDate)}</div>
                          ) : null}
                        </TableCell>
                        <TableCell className="hidden text-center xl:table-cell">
                          <Badge variant={overdue ? 'destructive' : 'secondary'}>
                            {closed ? labelFrom(debtStatusLabels, effectiveStatus) : lateDays === 0 ? 'Sem atraso' : `${lateDays} dia(s)`}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden text-center xl:table-cell">
                          {isRenegotiated ? (
                            <div className="inline-flex items-center gap-1 text-sm font-medium text-amber-700">
                              <CalendarClock className="h-4 w-4" />
                              {formatDate(debt.renegotiatedAt)}
                            </div>
                          ) : (
                            <span className="text-sm text-slate-500">Não</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <WhatsAppButton debt={debt} template={messageTemplate} />
                            {!closed ? <MarkAsPaidButton id={debt.id} /> : null}
                            <Button asChild size="sm" className="gap-2" title={`Editar cobrança de ${debt.customer.name}`}>
                              <Link href={`/dashboard/cobranca/${debt.id}`} aria-label={`Editar cobrança de ${debt.customer.name}`}>
                                <Pencil className="h-4 w-4" />
                                <span className="hidden xl:inline">Editar</span>
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      <EmptyState title="Nenhuma dívida encontrada" description="Ajuste os filtros ou registre uma venda fiada para iniciar a cobrança." />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </SectionCard>

      <div className="flex justify-center">
        {totalPages > 1 ? (
          <Suspense fallback={null}>
            <Pagination totalPages={totalPages} />
          </Suspense>
        ) : null}
      </div>
    </div>
  );
}
