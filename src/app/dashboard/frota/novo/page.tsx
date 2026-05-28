
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { VehicleForm } from '../VehicleForm'

export default function NewVehiclePage() {
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