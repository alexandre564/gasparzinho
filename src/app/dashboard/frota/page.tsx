import Link from 'next/link';
import { Download, FileSpreadsheet, Pencil, PlusCircle } from 'lucide-react';

import { prisma } from '@/lib/prisma';
import ImportVehiclesButton from './ImportVehiclesButton';
import { labelFrom, vehicleStatusLabels, vehicleTypeLabels } from '@/lib/labels';
import { Search } from '@/components/Search';
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

async function getVehicles(query = '') {
  const vehicles = await prisma.vehicle.findMany({
    orderBy: { placa: 'asc' },
  });

  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return vehicles;
  }

  return vehicles.filter((vehicle) => {
    const searchable = [
      vehicle.placa,
      vehicle.modelo,
      vehicle.tipo,
      vehicle.status,
      vehicle.observacoes ?? '',
      labelFrom(vehicleTypeLabels, vehicle.tipo),
      labelFrom(vehicleStatusLabels, vehicle.status),
    ]
      .join(' ')
      .toLowerCase();

    return searchable.includes(normalizedQuery);
  });
}

function getStatusVariant(status: string): BadgeProps['variant'] {
  if (status === 'ATIVO') return 'success';
  if (status === 'MANUTENCAO') return 'secondary';
  return 'outline';
}


type VehiclesPageProps = {
  searchParams?: { query?: string };
};

export default async function VehiclesPage({ searchParams }: VehiclesPageProps) {
  const query = searchParams?.query ?? '';
  const vehicles = await getVehicles(query);
  const exportParams = new URLSearchParams();

  if (query) exportParams.set('query', query);

  const exportHref = `/api/frota/exportar${exportParams.toString() ? `?${exportParams.toString()}` : ''}`;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Frota de veículos</CardTitle>
            <CardDescription>Gerencie veículos, status e custo médio por quilômetro.</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <Button asChild variant="outline" size="sm">
              <a href={exportHref} download>
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href="/api/frota/modelo" download>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Modelo CSV
              </a>
            </Button>
            <ImportVehiclesButton />
            <Button asChild size="sm">
              <Link href="/dashboard/frota/novo">
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar veículo
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Search placeholder="Buscar por placa, modelo ou status..." />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Placa</TableHead>
              <TableHead>Modelo</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Custo médio/km</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {vehicles.length > 0 ? (
              vehicles.map((vehicle) => (
                <TableRow key={vehicle.id}>
                  <TableCell className="font-mono font-semibold">{vehicle.placa}</TableCell>
                  <TableCell>{vehicle.modelo}</TableCell>
                  <TableCell>{labelFrom(vehicleTypeLabels, vehicle.tipo)}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(vehicle.status)}>
                      {labelFrom(vehicleStatusLabels, vehicle.status)}
                    </Badge>
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
                  Nenhum veículo encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
