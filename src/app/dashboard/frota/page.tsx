import Link from 'next/link';
import { Pencil, PlusCircle } from 'lucide-react';

import { prisma } from '@/lib/prisma';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';


export const dynamic = 'force-dynamic';
const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

async function getVehicles() {
  return prisma.vehicle.findMany({
    orderBy: { placa: 'asc' },
  });
}

function getStatusVariant(status: string): BadgeProps['variant'] {
  if (status === 'ATIVO') return 'success';
  if (status === 'MANUTENCAO') return 'secondary';
  return 'outline';
}

export default async function VehiclesPage() {
  const vehicles = await getVehicles();

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Frota de veiculos</CardTitle>
            <CardDescription>Gerencie veiculos, status e custo medio por quilometro.</CardDescription>
          </div>
          <Button asChild>
            <Link href="/dashboard/frota/novo">
              <PlusCircle className="mr-2 h-4 w-4" />
              Adicionar veiculo
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
              <TableHead className="text-right">Custo medio/km</TableHead>
              <TableHead className="text-right">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.length > 0 ? (
              vehicles.map((vehicle) => (
                <TableRow key={vehicle.id}>
                  <TableCell className="font-mono font-semibold">{vehicle.placa}</TableCell>
                  <TableCell>{vehicle.modelo}</TableCell>
                  <TableCell>{vehicle.tipo}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(vehicle.status)}>{vehicle.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{currency.format(vehicle.custoMedioKm)}</TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="outline" size="sm" className="gap-2">
                      <Link href={`/dashboard/frota/${vehicle.id}/editar`} aria-label={`Editar ${vehicle.placa}`}>
                        <Pencil className="h-4 w-4" />
                        Editar
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Nenhum veiculo cadastrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
