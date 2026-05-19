
import { PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

async function getVehicles() {
  const vehicles = await prisma.vehicle.findMany()
  return vehicles
}

export default async function VehiclesPage() {
  const vehicles = await getVehicles()

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Frota de Veículos</CardTitle>
            <CardDescription>
              Gerencie os veículos da sua frota.
            </CardDescription>
          </div>
          <Button asChild>
            <Link href="/dashboard/frota/novo">
              <PlusCircle className="mr-2 h-4 w-4" />
              Adicionar Veículo
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Placa</TableHead>
              <TableHead>Modelo</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Custo Médio/Km</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.map((vehicle) => (
              <TableRow key={vehicle.id}>
                <TableCell>{vehicle.placa}</TableCell>
                <TableCell>{vehicle.modelo}</TableCell>
                <TableCell>{vehicle.tipo}</TableCell>
                <TableCell>
                  <Badge variant={vehicle.status === 'ATIVO' ? 'default' : 'destructive'}>
                    {vehicle.status}
                  </Badge>
                </TableCell>
                <TableCell>{vehicle.custoMedioKm}</TableCell>
                <TableCell>
                  <Button asChild variant="outline">
                    <Link href={`/dashboard/frota/${vehicle.id}/editar`}>Editar</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
