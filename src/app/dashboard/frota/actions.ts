'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const vehicleSchema = z.object({
  placa: z.string().length(7),
  modelo: z.string().min(1),
  tipo: z.string().min(1),
  status: z.string().min(1),
  custoMedioKm: z.coerce.number().positive(),
  observacoes: z.string().optional(),
})

export async function createVehicle(data: unknown) {
  const result = vehicleSchema.safeParse(data)
  if (!result.success) {
    return { success: false as const, message: 'Erro de validação' }
  }
  await prisma.vehicle.create({ data: result.data })
  revalidatePath('/dashboard/frota')
  return { success: true as const, message: 'Veículo criado com sucesso!' }
}

export async function updateVehicle(id: string, data: unknown) {
  const result = vehicleSchema.safeParse(data)
  if (!result.success) {
    return { success: false as const, message: 'Erro de validação' }
  }
  await prisma.vehicle.update({ where: { id }, data: result.data })
  revalidatePath('/dashboard/frota')
  return { success: true as const, message: 'Veículo atualizado com sucesso!' }
}

export async function deleteVehicle(id: string) {
  await prisma.vehicle.delete({ where: { id } })
  revalidatePath('/dashboard/frota')
}
