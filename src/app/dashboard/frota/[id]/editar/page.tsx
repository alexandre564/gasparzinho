
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { VehicleForm } from '@/app/dashboard/frota/VehicleForm'
import { prisma } from '@/lib/prisma'

async function getVehicle(id: string) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
  })
  return vehicle
}

export default async function EditVehiclePage({ params }: { params: { id: string } }) {
  const vehicle = await getVehicle(params.id)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Editar Veículo</CardTitle>
      </CardHeader>
      <CardContent>
        <VehicleForm vehicle={vehicle} />
      </CardContent>
    </Card>
  )
}


export const dynamic = 'force-dynamic';