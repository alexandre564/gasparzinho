import Link from 'next/link';
import { format } from 'date-fns';
import { AlertCircle, CalendarClock, CheckCircle2, MessageCircle } from 'lucide-react';
import { prisma } from '@/lib/prisma';
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
import { getCollectionMessageTemplate } from '../configuracoes/actions';
import type { DebtStatus } from '@/types/enums';

async function getDebts() {
  return prisma.debt.findMany({
    where: {
      status: {
        in: ['PENDENTE', 'VENCIDO', 'RENEGOCIADO'],
      },
    },
    include: {
      customer: true,
      order: true,
    },
    orderBy: {
      dueDate: 'asc',
    },
  });
}

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const formatDate = (date?: Date | null) => (date ? format(date, 'dd/MM/yyyy') : '-');
const formatPhoneForWhatsApp = (phone: string) => phone.replace(/\D/g, '');

function buildCollectionMessage(template: string, debt: Awaited<ReturnType<typeof getDebts>>[number]) {
  return encodeURIComponent(
    template
      .replaceAll('{cliente}', debt.customer.name)
      .replaceAll('{valor}', currency.format(debt.value))
      .replaceAll('{vencimento}', formatDate(debt.dueDate)),
  );
}

export default async function CobrancaPage() {
  const [debts, messageTemplate] = await Promise.all([getDebts(), getCollectionMessageTemplate()]);

  const getStatusVariant = (status: DebtStatus) => {
    switch (status) {
      case 'VENCIDO':
        return 'destructive' as const;
      case 'PENDENTE':
        return 'default' as const;
      case 'RENEGOCIADO':
        return 'secondary' as const;
      case 'PAGO':
        return 'success' as const;
      default:
        return 'secondary' as const;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cobrança</CardTitle>
        <CardDescription>
          Acompanhe vencimentos, renegociações, datas previstas e mensagens de WhatsApp.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead className="text-right">Valor para pagamento</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Renegociação</TableHead>
              <TableHead>Pagamento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {debts.map((debt) => {
              const isRenegotiated = Boolean(debt.renegotiatedAt) || debt.status === 'RENEGOCIADO';
              const originalDueDate = debt.originalDueDate && debt.originalDueDate.getTime() !== debt.dueDate.getTime()
                ? debt.originalDueDate
                : null;

              return (
                <TableRow key={debt.id}>
                  <TableCell>
                    <div className="font-semibold text-slate-950">{debt.customer.name}</div>
                    <div className="text-xs text-slate-500">Compra: {formatDate(debt.createdAt)}</div>
                  </TableCell>
                  <TableCell>{debt.customer.phone}</TableCell>
                  <TableCell className="text-right font-mono font-semibold text-emerald-700">
                    {currency.format(debt.renegotiatedValue ?? debt.value)}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{formatDate(debt.dueDate)}</div>
                    {originalDueDate ? (
                      <div className="text-xs text-slate-500">Original: {formatDate(originalDueDate)}</div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    {isRenegotiated ? (
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-1 font-medium text-amber-700">
                          <CalendarClock className="h-3.5 w-3.5" />
                          Sim
                        </div>
                        <div className="text-xs text-slate-600">Em: {formatDate(debt.renegotiatedAt)}</div>
                        <div className="text-xs text-slate-600">Nova previsão: {formatDate(debt.dueDate)}</div>
                        {debt.notes ? (
                          <pre className="mt-2 whitespace-pre-wrap rounded-md bg-white p-2 text-xs text-slate-700">
                            {debt.notes}
                          </pre>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-sm text-slate-500">Não</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {debt.paidAt ? (
                      <div className="flex items-center gap-1 text-sm font-medium text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {formatDate(debt.paidAt)}
                      </div>
                    ) : (
                      <span className="text-sm text-slate-500">Em aberto</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(debt.status as DebtStatus)}>{debt.status}</Badge>
                  </TableCell>
                  <TableCell className="space-x-2 text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link
                        href={`https://wa.me/55${formatPhoneForWhatsApp(debt.customer.phone)}?text=${buildCollectionMessage(messageTemplate, debt)}`}
                        target="_blank"
                      >
                        <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
                      </Link>
                    </Button>
                    <Button asChild size="sm">
                      <Link href={`/dashboard/cobranca/${debt.id}`}>
                        <AlertCircle className="mr-2 h-4 w-4" /> Renegociar
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {debts.length === 0 && (
          <div className="py-8 text-center text-muted-foreground">
            Nenhuma dívida pendente, vencida ou renegociada encontrada.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
