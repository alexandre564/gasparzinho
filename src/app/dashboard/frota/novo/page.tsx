
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { VehicleForm } from '../VehicleForm'
import { requirePageAccess } from '@/lib/page-auth'

export default async function NewVehiclePage() {
  await requirePageAccess(['ADMIN'])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Adicionar novo veículo</CardTitle>
      </CardHeader>
      <CardContent>
        <VehicleForm />
      </CardContent>
    </Card>
  )
}


export const dynamic = 'force-dynamic';
