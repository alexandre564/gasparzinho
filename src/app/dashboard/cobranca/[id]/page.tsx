export const dynamic = 'force-dynamic';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import DebtRenegotiationForm from './DebtRenegotiationForm';
import DeleteDebtButton from './DeleteDebtButton';
import { getDebtPaymentBreakdown } from '@/lib/debts';
import { buildBranchWhere } from '@/lib/branch-scope';
import { getCurrentBranchScope } from '@/lib/current-branch-scope';
import { requirePageAccess } from '@/lib/page-auth';

async function getDebt(id: string) {
  const branchScope = await getCurrentBranchScope();
  const debt = await prisma.debt.findFirst({
    where: buildBranchWhere(branchScope, { id }),
    include: {
      customer: true,
      order: true,
    },
  });

  if (!debt) {
    notFound();
  }

  return debt;
}

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const formatDate = (date?: Date | null) => (date ? format(date, 'dd/MM/yyyy') : '-');

export default async function RenegotiateDebtPage({ params }: { params: { id: string } }) {
  const session = await requirePageAccess(['ADMIN']);

  const debt = await getDebt(params.id);
  const paymentBreakdown = getDebtPaymentBreakdown(debt.notes);
  const isAdmin = session.user?.role?.toUpperCase() === 'ADMIN';

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
      <Card>
        <CardHeader>
          <CardTitle>Resumo da cobrança</CardTitle>
          <CardDescription>Confira o histórico antes de alterar o combinado.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="text-slate-500">Cliente</p>
            <p className="font-semibold">{debt.customer.name}</p>
          </div>
          <div>
            <p className="text-slate-500">Telefone</p>
            <p className="font-semibold">{debt.customer.phone}</p>
          </div>
          <div className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2">
            <div>
              <p className="text-slate-500">Valor atual</p>
              <p className="font-semibold text-emerald-700">{currency.format(debt.value)}</p>
            </div>
            <div>
              <p className="text-slate-500">Status</p>
              <Badge variant="secondary">{debt.status}</Badge>
            </div>
            <div>
              <p className="text-slate-500">Vencimento</p>
              <p className="font-semibold">{formatDate(debt.dueDate)}</p>
            </div>
            <div>
              <p className="text-slate-500">Pagamento</p>
              <p className="font-semibold">{formatDate(debt.paidAt)}</p>
            </div>
            <div>
              <p className="text-slate-500">Pago na renegociação</p>
              <p className="font-semibold">{paymentBreakdown.paidAmount !== null ? currency.format(paymentBreakdown.paidAmount) : '-'}</p>
            </div>
            <div>
              <p className="text-slate-500">Restante registrado</p>
              <p className="font-semibold">{paymentBreakdown.remainingValue !== null ? currency.format(paymentBreakdown.remainingValue) : currency.format(debt.renegotiatedValue ?? debt.value)}</p>
            </div>
          </div>
          {debt.renegotiatedAt ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
              Renegociado em {formatDate(debt.renegotiatedAt)}. Vencimento original:{' '}
              {formatDate(debt.originalDueDate)}.
            </div>
          ) : null}
          {isAdmin ? (
            <div className="space-y-2 rounded-lg border border-red-100 bg-white p-3">
              <div>
                <p className="text-sm font-bold text-red-800">Acao administrativa</p>
                <p className="text-xs text-slate-600">
                  Use somente para erro de lancamento, duplicidade ou cobranca criada indevidamente.
                  Para recebimento, prefira marcar como paga; para novo combinado, prefira renegociar.
                </p>
              </div>
              <DeleteDebtButton debtId={debt.id} status={debt.status} paidAt={debt.paidAt} />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Renegociar dívida</CardTitle>
          <CardDescription>
            Registre pagamento parcial, restante a receber e nova data prevista sem quitar a dívida.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DebtRenegotiationForm debt={debt} />
        </CardContent>
      </Card>
    </div>
  );
}
