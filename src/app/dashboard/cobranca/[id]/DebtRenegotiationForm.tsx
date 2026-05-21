'use client';

import { useEffect } from 'react';
import { type Resolver, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { updateDebt } from '../actions';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const renegotiationSchema = z.object({
  paidAmount: z.coerce.number().min(0, 'O valor pago nao pode ser negativo.'),
  remainingValue: z.coerce.number().min(0, 'O restante a receber nao pode ser negativo.'),
  newDueDate: z.string().min(1, 'Informe a nova data prevista.'),
  paymentDate: z.string().optional(),
  notes: z.string().max(500, 'Use no maximo 500 caracteres.').optional(),
});

type RenegotiationFormValues = z.infer<typeof renegotiationSchema>;

type DebtRenegotiationFormProps = {
  debt: {
    id: string;
    value: number;
    dueDate: Date | string;
    notes?: string | null;
  };
};

const formatInputDate = (date?: Date | string | null) => {
  if (!date) return '';
  return new Date(date).toISOString().split('T')[0];
};

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export default function DebtRenegotiationForm({ debt }: DebtRenegotiationFormProps) {
  const router = useRouter();

  const form = useForm<RenegotiationFormValues>({
    resolver: zodResolver(renegotiationSchema) as unknown as Resolver<RenegotiationFormValues>,
    defaultValues: {
      paidAmount: 0,
      remainingValue: debt.value,
      newDueDate: formatInputDate(debt.dueDate),
      paymentDate: '',
      notes: '',
    },
  });

  const paidAmount = Number(form.watch('paidAmount') || 0);

  useEffect(() => {
    const remaining = Math.max(Number(debt.value) - paidAmount, 0);
    form.setValue('remainingValue', Number(remaining.toFixed(2)), {
      shouldDirty: true,
      shouldValidate: true,
    });
  }, [debt.value, form, paidAmount]);

  async function onSubmit(values: RenegotiationFormValues) {
    const result = await updateDebt(debt.id, values);

    if (result.success) {
      toast.success(result.message);
      router.push('/dashboard/cobranca');
      router.refresh();
      return;
    }

    if (result.errors) {
      result.errors.forEach((error) => {
        form.setError(error.path[0] as keyof RenegotiationFormValues, {
          type: 'manual',
          message: error.message,
        });
      });

      toast.error('Erro de validacao. Verifique os campos.');
      return;
    }

    toast.error(result.message || 'Nao foi possivel renegociar a divida.');
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="rounded-lg border bg-slate-50 p-3 text-sm">
          <div className="flex justify-between">
            <span>Divida atual</span>
            <strong>{currency.format(debt.value)}</strong>
          </div>
        </div>

        <FormField
          control={form.control}
          name="paidAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Valor pago agora</FormLabel>
              <FormControl>
                <Input type="number" min="0" step="0.01" {...field} />
              </FormControl>
              <p className="text-xs text-slate-500">
                Informe apenas o valor pago nesta renegociacao. Se nao houve pagamento, deixe 0.
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="remainingValue"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Restante a receber</FormLabel>
              <FormControl>
                <Input type="number" min="0" step="0.01" {...field} />
              </FormControl>
              <p className="text-xs text-slate-500">
                Este valor continua aparecendo em cobranca ate ser quitado.
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="newDueDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nova data prevista para o restante</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="paymentDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data do pagamento parcial</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <p className="text-xs text-slate-500">
                Use para registrar quando o cliente pagou parte da divida. Nao quita a cobranca.
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observacoes da renegociacao</FormLabel>
              <FormControl>
                <Textarea rows={4} placeholder="Ex.: cliente combinou pagar o restante apos receber salario." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          Salvar renegociacao
        </Button>
      </form>
    </Form>
  );
}
