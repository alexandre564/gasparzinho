import Link from 'next/link';
import { Suspense } from 'react';
import { CalendarClock, Download, Loader2, MessageCircle, Pencil } from 'lucide-react';
import type { Debt } from '@prisma/client';
import { getPaginatedDebts, getTotalOpenDebt } from '@/app/dashboard/financeiro/actions';
import { getCollectionMessageTemplate } from '@/app/dashboard/configuracoes/actions';
import type { DebtStatus } from './types';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import Pagination from '@/components/Pagination';
import { Search } from '@/components/Search';
import StatusFilter from './StatusFilter';
import MarkAsPaidButton from './MarkAsPaidButton';
import ImportDebtsButton from '../../cobranca/ImportDebtsButton';
import { buildWhatsAppUrl } from '@/lib/whatsapp';
import { debtStatusLabels, labelFrom } from '@/lib/labels';


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
      return 'secondary';
    default:
      return 'outline';
  }
};


const formatDate = (date?: Date | null) =>
  date ? new Date(date).toLocaleDateString('pt-BR') : '-';

function daysLate(dueDate: Date, paidAt?: Date | null) {
  const reference = paidAt ? new Date(paidAt) : new Date();
  const due = new Date(dueDate);
  reference.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);

  return Math.max(
    Math.floor((reference.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)),
    0,
  );
}

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
    <Card className="border-red-200 bg-red-600 text-white">
      <CardHeader>
        <CardTitle>Total em aberto</CardTitle>
        <CardDescription className="text-red-50">
          Soma de todas as dívidas pendentes, atrasadas e renegociadas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{currency.format(totalOpen)}</p>
      </CardContent>
    </Card>
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
  const query = searchParams?.query ?? '';
  const currentPage = Number(searchParams?.page ?? '1');
  const status = searchParams?.status as DebtStatus | undefined;
  const exportParams = new URLSearchParams();

  if (query) exportParams.set('query', query);

  const exportHref = `/api/cobranca/exportar${exportParams.toString() ? `?${exportParams.toString()}` : ''}`;

  const [{ debts, totalPages }, messageTemplate] = await Promise.all([
    getPaginatedDebts(query, currentPage, status),
    getCollectionMessageTemplate(),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gestão de dívidas</h1>
          <p className="text-sm text-slate-600">
            Acompanhe valores em aberto, pagos, renegociações, vencimentos e pagamentos.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
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
        </div>
      </div>

      <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin" />}>
        <TotalOpenDebtCard />
      </Suspense>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Suspense fallback={<div className="h-11 w-full max-w-xl rounded-md border bg-white" />}>
              <Search placeholder="Buscar por cliente, telefone ou status..." />
            </Suspense>
            <Suspense fallback={null}>
              <StatusFilter />
            </Suspense>
          </div>
        </CardHeader>

        <CardContent>
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
                    const isRenegotiated = Boolean(debt.renegotiatedAt) || debt.status === 'RENEGOCIADO';
                    const lateDays = daysLate(debt.dueDate, debt.paidAt);

                    return (
                      <TableRow key={debt.id} className={debt.status === 'PAGO' ? 'bg-emerald-50/50' : undefined}>
                        <TableCell>
                          <div className="font-bold text-slate-950">{debt.customer.name}</div>
                          <div className="text-xs text-slate-600">{debt.customer.phone}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(debt.status)}>
                            {labelFrom(debtStatusLabels, debt.status)}
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
                          <Badge variant={lateDays > 0 && debt.status !== 'PAGO' ? 'destructive' : 'secondary'}>
                            {lateDays === 0 ? 'Sem atraso' : `${lateDays} dia(s)`}
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
                            {debt.status !== 'PAGO' ? <MarkAsPaidButton id={debt.id} /> : null}
                            <Button asChild size="sm" className="gap-2">
                              <Link href={`/dashboard/cobranca/${debt.id}`}>
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
                      Nenhuma dívida encontrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

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
