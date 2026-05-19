'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Debt } from '@prisma/client'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { updateDebt } from '../actions'

const renegotiationSchema = z.object({
  value: z.coerce.number().positive("O novo valor deve ser positivo."),
  dueDate: z.coerce.date({ message: "A nova data é obrigatória." }),
  // O campo de observação não existe no model Debt. 
  // Se for uma necessidade, precisa ser adicionado no schema.prisma
});

type RenegotiationFormValues = z.infer<typeof renegotiationSchema>

export function DebtRenegotiationForm({ debt }: { debt: Debt }) {
  const router = useRouter()

  const form = useForm<RenegotiationFormValues>({
    resolver: zodResolver(renegotiationSchema) as any, // Workaround de compatibilidade
    defaultValues: {
      value: debt.value || 0,
      dueDate: new Date(debt.dueDate) || new Date(),
    },
  })

  async function onSubmit(values: RenegotiationFormValues) {
    const result = await updateDebt(debt.id, values)

    if (result.success) {
      toast.success(result.message)
      router.push('/dashboard/cobranca')
    } else {
      if (result.errors) {
        result.errors.forEach(// eslint-disable-next-line @typescript-eslint/no-explicit-any
            (error: any) => {
            form.setError(error.path[0] as keyof RenegotiationFormValues, {
              type: 'manual',
              message: error.message,
            });
          });
        toast.error("Erro de validação. Verifique os campos.")
      } else {
          toast.error(result.message)
      }
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="value"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Novo Valor da Dívida</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="dueDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nova Data de Vencimento</FormLabel>
              <FormControl>
                 <Input 
                    type="date" 
                    {...field} 
                    value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Salvando...' : 'Salvar Renegociação'}
        </Button>
      </form>
    </Form>
  )
}
