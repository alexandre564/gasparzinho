'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Vehicle } from '@prisma/client'
import { useRouter } from 'next/navigation'
import { type Resolver, useForm } from 'react-hook-form'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createVehicle, updateVehicle } from './actions'

const vehicleFormSchema = z.object({
  placa: z.string().length(7, 'A placa deve ter 7 caracteres.'),
  modelo: z.string().min(1, 'O modelo é obrigatório.'),
  tipo: z.string().min(1, 'Selecione o tipo.'),
  status: z.string().min(1, 'Selecione o status.'),
  custoMedioKm: z.coerce.number().positive('O custo deve ser positivo.'),
  observacoes: z.string().optional(),
})

type VehicleFormValues = z.infer<typeof vehicleFormSchema>

export function VehicleForm({ vehicle }: { vehicle?: Vehicle | null }) {
  const router = useRouter()
  const isUpdate = !!vehicle?.id

  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema) as unknown as Resolver<VehicleFormValues>,
    defaultValues: {
      placa: vehicle?.placa ?? '',
      modelo: vehicle?.modelo ?? '',
      tipo: vehicle?.tipo ?? 'VAN',
      status: vehicle?.status ?? 'ATIVO',
      custoMedioKm: vehicle?.custoMedioKm ?? 0,
      observacoes: vehicle?.observacoes ?? '',
    },
  })

  async function onSubmit(values: VehicleFormValues) {
    const result = isUpdate
      ? await updateVehicle(vehicle!.id, values)
      : await createVehicle(values)

    if (result.success) {
      toast.success(result.message)
      router.push('/dashboard/frota')
    } else {
      toast.error(result.message)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField control={form.control} name="placa" render={({ field }) => (
          <FormItem>
            <FormLabel>Placa</FormLabel>
            <FormControl><Input placeholder="ABC1234" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="modelo" render={({ field }) => (
          <FormItem>
            <FormLabel>Modelo</FormLabel>
            <FormControl><Input placeholder="Fiat Doblo" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="tipo" render={({ field }) => (
          <FormItem>
            <FormLabel>Tipo</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="VAN">VAN</SelectItem>
                <SelectItem value="MOTO">MOTO</SelectItem>
                <SelectItem value="CAMINHAO">CAMINHAO</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="status" render={({ field }) => (
          <FormItem>
            <FormLabel>Status</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="ATIVO">ATIVO</SelectItem>
                <SelectItem value="MANUTENCAO">MANUTENCAO</SelectItem>
                <SelectItem value="INATIVO">INATIVO</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="custoMedioKm" render={({ field }) => (
          <FormItem>
            <FormLabel>Custo Medio por KM (R$)</FormLabel>
            <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="observacoes" render={({ field }) => (
          <FormItem>
            <FormLabel>Observações</FormLabel>
            <FormControl><Textarea {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Salvando...' : isUpdate ? 'Atualizar' : 'Cadastrar'}
        </Button>
      </form>
    </Form>
  )
}
