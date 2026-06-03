'use client';

import { useState, useTransition } from 'react';
import { Loader2, ShieldAlert, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { cancelDebtWithAudit } from '../actions';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const reasonOptions = [
  { value: 'ERRO_LANCAMENTO', label: 'Erro de lancamento' },
  { value: 'DUPLICIDADE', label: 'Duplicidade' },
  { value: 'CRIADA_POR_ENGANO', label: 'Cobranca criada por engano' },
  { value: 'OUTRO', label: 'Outro motivo' },
] as const;

type DeleteDebtButtonProps = {
  debtId: string;
  status: string;
  paidAt?: Date | string | null;
};

function isCancellationBlocked(status: string, paidAt?: Date | string | null) {
  const normalizedStatus = status.toUpperCase();
  return normalizedStatus === 'PAGO' || normalizedStatus === 'CANCELADA' || Boolean(paidAt);
}

export default function DeleteDebtButton({ debtId, status, paidAt }: DeleteDebtButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof reasonOptions)[number]['value']>('ERRO_LANCAMENTO');
  const [reasonDetails, setReasonDetails] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [isPending, startTransition] = useTransition();
  const blocked = isCancellationBlocked(status, paidAt);
  const needsDetails = reason === 'OUTRO';
  const canSubmit = !blocked && confirmation === 'CANCELAR' && (!needsDetails || reasonDetails.trim().length > 0);

  function handleCancelDebt() {
    if (!canSubmit) {
      toast.error('Confirme o motivo e digite CANCELAR para continuar.');
      return;
    }

    startTransition(async () => {
      const result = await cancelDebtWithAudit(debtId, {
        reason,
        reasonDetails,
        confirmation,
      });

      if (result.success) {
        toast.success(result.message);
        setOpen(false);
        router.push('/dashboard/cobranca');
        router.refresh();
        return;
      }

      toast.error(result.message || 'Nao foi possivel cancelar a divida.');
    });
  }

  if (blocked) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
        A exclusao administrativa fica indisponivel para dividas pagas ou ja canceladas, preservando o historico.
      </div>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full gap-2 border-red-200 text-red-700 hover:border-red-300 hover:bg-red-50 hover:text-red-800"
          aria-label="Excluir divida"
          title="Excluir divida"
        >
          <Trash2 className="h-4 w-4" />
          Excluir divida
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-800">
            <ShieldAlert className="h-5 w-5" />
            Cancelamento controlado da divida
          </AlertDialogTitle>
          <AlertDialogDescription>
            Esta acao remove a cobranca do fluxo operacional, mas preserva o registro com status
            CANCELADA e auditoria no historico. Use apenas para erro de lancamento, duplicidade
            ou cobranca criada indevidamente.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="debt-cancel-reason">Motivo da exclusao</Label>
            <select
              id="debt-cancel-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value as typeof reason)}
              className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
            >
              {reasonOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="debt-cancel-details">
              Detalhe do motivo {needsDetails ? <span className="text-red-700">*</span> : null}
            </Label>
            <Textarea
              id="debt-cancel-details"
              rows={3}
              value={reasonDetails}
              onChange={(event) => setReasonDetails(event.target.value)}
              placeholder="Ex.: cobranca duplicada criada durante teste de importacao."
            />
          </div>

          <div className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-3">
            <Label htmlFor="debt-cancel-confirmation" className="text-red-900">
              Digite CANCELAR para confirmar
            </Label>
            <Input
              id="debt-cancel-confirmation"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder="CANCELAR"
              autoComplete="off"
            />
            <p className="text-xs font-medium text-red-800">
              A divida nao sera apagada fisicamente, mas deixara de aparecer como pendente,
              vencida ou prioritaria.
            </p>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Voltar</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={!canSubmit || isPending}
            onClick={handleCancelDebt}
            className="gap-2"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Confirmar cancelamento
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
