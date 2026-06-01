'use server'

import { prisma } from '@/lib/prisma'
import { requireActionAccess } from '@/lib/api-auth'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getCurrentBranchScope } from '@/lib/current-branch-scope'
import { buildBranchWhere } from '@/lib/branch-scope'

const vehicleSchema = z.object({
  placa: z.string().length(7),
  modelo: z.string().min(1),
  tipo: z.string().min(1),
  status: z.string().min(1),
  custoMedioKm: z.coerce.number().positive(),
  observacoes: z.string().optional(),
})

export type ImportVehiclesState = {
  success: boolean
  message: string
}

function normalizeHeader(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function detectDelimiter(line: string) {
  const delimiters = [';', ',', '\t']
  return delimiters.reduce((selected, delimiter) => {
    const currentCount = line.split(delimiter).length
    const selectedCount = line.split(selected).length
    return currentCount > selectedCount ? delimiter : selected
  }, ';')
}

function parseCsvLine(line: string, delimiter: string) {
  const cells: string[] = []
  let current = ''
  let insideQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const nextChar = line[index + 1]

    if (char === '"' && nextChar === '"') {
      current += '"'
      index += 1
    } else if (char === '"') {
      insideQuotes = !insideQuotes
    } else if (char === delimiter && !insideQuotes) {
      cells.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  cells.push(current.trim())
  return cells.map((cell) => cell.replace(/^"|"$/g, '').trim())
}

function pickValue(row: Record<string, string>, options: string[]) {
  for (const option of options) {
    const value = row[normalizeHeader(option)]
    if (value !== undefined && value.trim() !== '') return value.trim()
  }
  return ''
}

function parseMoneyValue(value: string) {
  const normalized = value
    .replace(/\s/g, '')
    .replace(/[R$]/gi, '')
    .replace(/\./g, '')
    .replace(',', '.')

  const parsed = Number(normalized)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

function normalizePlate(value: string) {
  return value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 7)
}

function normalizeVehicleType(value: string) {
  const normalized = normalizeHeader(value)
  if (normalized.includes('moto')) return 'MOTO'
  if (normalized.includes('caminh')) return 'CAMINHAO'
  if (normalized.includes('carro')) return 'CARRO'
  if (normalized.includes('van')) return 'VAN'
  return value.trim().toUpperCase() || 'VAN'
}

function normalizeVehicleStatus(value: string) {
  const normalized = normalizeHeader(value)
  if (normalized.includes('manut')) return 'MANUTENCAO'
  if (normalized.includes('inativo') || normalized.includes('parado')) return 'INATIVO'
  return 'ATIVO'
}

export async function createVehicle(data: unknown) {
  const denied = await requireActionAccess(['ADMIN'])
  if (denied) return denied

  const result = vehicleSchema.safeParse(data)
  if (!result.success) {
    return { success: false as const, message: 'Erro de validação' }
  }
  const branchScope = await getCurrentBranchScope()
  await prisma.vehicle.create({ data: { ...result.data, branchId: branchScope.branchId } })
  revalidatePath('/dashboard/frota')
  return { success: true as const, message: 'Veículo criado com sucesso!' }
}

export async function updateVehicle(id: string, data: unknown) {
  const denied = await requireActionAccess(['ADMIN'])
  if (denied) return denied

  const result = vehicleSchema.safeParse(data)
  if (!result.success) {
    return { success: false as const, message: 'Erro de validação' }
  }
  const branchScope = await getCurrentBranchScope()
  const updated = await prisma.vehicle.updateMany({
    where: buildBranchWhere(branchScope, { id }),
    data: result.data,
  })
  if (updated.count === 0) {
    return { success: false as const, message: 'Veículo não encontrado para esta filial.' }
  }
  revalidatePath('/dashboard/frota')
  return { success: true as const, message: 'Veículo atualizado com sucesso!' }
}

export async function deleteVehicle(id: string) {
  const denied = await requireActionAccess(['ADMIN'])
  if (denied) return denied

  const branchScope = await getCurrentBranchScope()
  const deleted = await prisma.vehicle.deleteMany({ where: buildBranchWhere(branchScope, { id }) })
  if (deleted.count === 0) {
    return { success: false as const, message: 'Veículo não encontrado para esta filial.' }
  }
  revalidatePath('/dashboard/frota')
  return { success: true as const, message: 'Veículo excluído com sucesso!' }
}

export async function importVehicles(
  _previousState: ImportVehiclesState,
  formData: FormData,
): Promise<ImportVehiclesState> {
  const denied = await requireActionAccess(['ADMIN'])
  if (denied) return denied

  const file = formData.get('file')

  if (!(file instanceof File) || file.size === 0) {
    return { success: false, message: 'Selecione um arquivo CSV, CDSV ou TXT para importar.' }
  }

  const validExtension = /\.(csv|cdsv|txt)$/i.test(file.name)
  if (!validExtension) {
    return { success: false, message: 'Use um arquivo CSV, CDSV ou TXT compatível com Excel.' }
  }

  const content = (await file.text()).replace(/^\uFEFF/, '')
  const rawLines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (rawLines.length < 2) {
    return { success: false, message: 'A planilha precisa ter cabeçalho e pelo menos um veículo.' }
  }

  const dataLines = rawLines[0].toLowerCase().startsWith('sep=') ? rawLines.slice(1) : rawLines
  const delimiter = rawLines[0].toLowerCase().startsWith('sep=')
    ? rawLines[0].slice(4, 5)
    : detectDelimiter(dataLines[0])
  const headers = parseCsvLine(dataLines[0], delimiter).map(normalizeHeader)

  let created = 0
  let updated = 0
  let ignored = 0
  const branchScope = await getCurrentBranchScope()

  for (const line of dataLines.slice(1)) {
    const cells = parseCsvLine(line, delimiter)
    const row = headers.reduce<Record<string, string>>((accumulator, header, index) => {
      accumulator[header] = cells[index] ?? ''
      return accumulator
    }, {})

    const placa = normalizePlate(pickValue(row, ['placa', 'plate']))
    const modelo = pickValue(row, ['modelo', 'veiculo', 'veículo', 'model'])
    const tipo = normalizeVehicleType(pickValue(row, ['tipo', 'type']))
    const status = normalizeVehicleStatus(pickValue(row, ['status', 'situacao', 'situação']))
    const custoMedioKm = parseMoneyValue(
      pickValue(row, ['custo medio km', 'custo médio km', 'custo km', 'custoMedioKm']),
    )
    const observacoes = pickValue(row, ['observacoes', 'observações', 'observacao', 'observação', 'notes'])

    if (placa.length !== 7 || !modelo || custoMedioKm <= 0) {
      ignored += 1
      continue
    }

    const existing = await prisma.vehicle.findUnique({
      where: { placa },
      select: { id: true },
    })

    if (existing) {
      await prisma.vehicle.update({
        where: { id: existing.id },
        data: { modelo, tipo, status, custoMedioKm, observacoes },
      })
      updated += 1
    } else {
      await prisma.vehicle.create({
        data: { placa, modelo, tipo, status, custoMedioKm, observacoes, branchId: branchScope.branchId },
      })
      created += 1
    }
  }

  revalidatePath('/dashboard/frota')

  if (created + updated === 0) {
    return {
      success: false,
      message: `Nenhum veículo foi importado. Verifique placa, modelo e custo médio/km. Linhas ignoradas: ${ignored}.`,
    }
  }

  return {
    success: true,
    message: `${created} veículo(s) criado(s), ${updated} atualizado(s). Linhas ignoradas: ${ignored}.`,
  }
}
