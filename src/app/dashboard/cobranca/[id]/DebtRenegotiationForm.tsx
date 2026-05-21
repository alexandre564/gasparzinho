'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
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
import { updateDebt } from '../actions';

const renegotiationSchema = z.object({
  renegotiatedValue: z.coerce.number().positive('Informe um valor para pagamento maior que zero.'),
  newDueDate: z.string().min(1, 'Informe a nova data prevista.'),
  paidAt: z.string().optional(),
  notes: z.string().max(500, 'Use no máximo 500 caracteres.').optional(),
});

type RenegotiationFormValues = z.infer<typeof renegotiationSchema>;

type DebtRenegotiationFormProps = {
  debt: {
    id: string;
    value: number;
    dueDate: Date | string;
    paidAt?: Date | string | null;
    notes?: string | null;
  };
};

const formatInputDate = (date?: Date | string | null) => {
  if (!date) return '';
  return new Date(date).toISOString().split('T')[0];
};

export default function DebtRenegotiationForm({ debt }: DebtRenegotiationFormProps) {
  const router = useRouter();

  const form = useForm<RenegotiationFormValues>({
    resolver: zodResolver(renegotiationSchema) as any,
    defaultValues: {
      renegotiatedValue: debt.value,
      newDueDate: formatInputDate(debt.dueDate),
      paidAt: formatInputDate(debt.paidAt),
      notes: debt.notes ?? '',
    },
  });

  async function onSubmit(values: RenegotiationFormValues) {
    const result = await updateDebt(debt.id, values);

    if (result.success) {
      toast.success(result.message);
      router.push('/dashboard/cobranca');
      return;
    }

    if (result.errors) {
      result.errors.forEach((error) => {
        form.setError(error.path[0] as keyof RenegotiationFormValues, {
          type: 'manual',
          message: error.message,
        });
      });

      toast.error('Erro de validação. Verifique os campos.');
      return;
    }

    toast.error(result.message || 'Não foi possível renegociar a dívida.');
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="renegotiatedValue"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Valor para pagamento</FormLabel>
              <FormControl>
                <Input type="number" min="0.01" step="0.01" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="newDueDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nova data prevista</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="paidAt"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data de pagamento</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <p className="text-xs text-slate-500">Preencha somente se o cliente já pagou.</p>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações da renegociação</FormLabel>
              <FormControl>
                <Textarea rows={4} placeholder="Ex.: cliente pediu para pagar após receber salário." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          Salvar renegociação
        </Button>
      </form>
    </Form>
  );
}
