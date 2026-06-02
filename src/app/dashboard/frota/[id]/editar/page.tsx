
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { VehicleForm } from '@/app/dashboard/frota/VehicleForm'
import { prisma } from '@/lib/prisma'
import { buildBranchWhere } from '@/lib/branch-scope'
import { getCurrentBranchScope } from '@/lib/current-branch-scope'
import { requirePageAccess } from '@/lib/page-auth'

async function getVehicle(id: string) {
  const branchScope = await getCurrentBranchScope()
  const vehicle = await prisma.vehicle.findFirst({
    where: buildBranchWhere(branchScope, { id }),
  })
  return vehicle
}

export default async function EditVehiclePage({ params }: { params: { id: string } }) {
  await requirePageAccess(['ADMIN'])

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
