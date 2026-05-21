import Link from 'next/link';
import { Suspense } from 'react';
import { CalendarClock, Loader2, MessageCircle, Pencil } from 'lucide-react';
import type { Debt } from '@prisma/client';
import {
  getPaginatedDebts,
  getTotalOpenDebt,
} from '@/app/dashboard/financeiro/actions';
import { getCollectionMessageTemplate } from '@/app/dashboard/configuracoes/actions';
import type { DebtStatus } from './types';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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

const formatPhoneForWhatsApp = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('55') ? digits : `55${digits}`;
};

type DebtWithCustomer = Debt & {
  customer: {
    name: string;
    phone: string;
  };
};

function buildCollectionMessage(template: string, debt: DebtWithCustomer) {
  return encodeURIComponent(
    template
      .replaceAll('{cliente}', debt.customer.name)
      .replaceAll('{valor}', currency.format(debt.renegotiatedValue ?? debt.value))
      .replaceAll('{vencimento}', formatDate(debt.dueDate)),
  );
}

function WhatsAppButton({ debt, template }: { debt: DebtWithCustomer; template: string }) {
  const url = `https://wa.me/${formatPhoneForWhatsApp(debt.customer.phone)}?text=${buildCollectionMessage(template, debt)}`;

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

  const [{ debts, totalPages }, messageTemplate] = await Promise.all([
    getPaginatedDebts(query, currentPage, status),
    getCollectionMessageTemplate(),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Gestão de dívidas</h1>
        <p className="text-sm text-slate-600">
          Acompanhe valores em aberto, renegociações, vencimentos e pagamentos.
        </p>
      </div>

      <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin" />}>
        <TotalOpenDebtCard />
      </Suspense>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Search placeholder="Buscar por cliente..." />
            <StatusFilter />
          </div>
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor para pagamento</TableHead>
                <TableHead className="hidden text-center md:table-cell">Compra</TableHead>
                <TableHead className="hidden text-center lg:table-cell">Vencimento</TableHead>
                <TableHead className="hidden text-center xl:table-cell">Renegociação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {debts.length > 0 ? (
                debts.map((debt: DebtWithCustomer) => {
                  const isRenegotiated = Boolean(debt.renegotiatedAt) || debt.status === 'RENEGOCIADO';

                  return (
                    <TableRow key={debt.id}>
                      <TableCell>
                        <div className="font-bold text-slate-950">{debt.customer.name}</div>
                        <div className="text-xs text-slate-600">{debt.customer.phone}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(debt.status)}>{debt.status}</Badge>
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
                  <TableCell colSpan={7} className="h-24 text-center">
                    Nenhuma dívida encontrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        {totalPages > 1 && <Pagination totalPages={totalPages} />}
      </div>
    </div>
  );
}
