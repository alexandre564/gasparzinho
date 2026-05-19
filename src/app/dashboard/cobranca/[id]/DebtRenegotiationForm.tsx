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
import { updateDebt } from '../actions';

const renegotiationSchema = z.object({
  amountPaid: z.coerce.number().min(0, 'Informe um valor válido.'),
  newDueDate: z.string().min(1, 'Informe a nova data de vencimento.'),
});

type RenegotiationFormValues = z.infer<typeof renegotiationSchema>;

type DebtRenegotiationFormProps = {
  debt: {
    id: string;
    amount: number;
    dueDate: Date | string;
  };
};

export default function DebtRenegotiationForm({
  debt,
}: DebtRenegotiationFormProps) {
  const router = useRouter();

  const form = useForm<RenegotiationFormValues>({
    resolver: zodResolver(renegotiationSchema) as any,
    defaultValues: {
      amountPaid: 0,
      newDueDate: new Date(debt.dueDate).toISOString().split('T')[0],
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
      result.errors.forEach((error: any) => {
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
          name="amountPaid"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Valor pago</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" {...field} />
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
              <FormLabel>Nova data de vencimento</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">
          Salvar renegociação
        </Button>
      </form>
    </Form>
  );
}
