
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import DebtRenegotiationForm from './DebtRenegotiationForm'

async function getDebt(id: string) {
  const debt = await prisma.debt.findUnique({
    where: { id },
    include: {
        customer: true // Incluindo o cliente para exibir informações
    }
  })

  if (!debt) {
    notFound();
  }
  
  return debt
}

export default async function RenegotiateDebtPage({ params }: { params: { id: string } }) {
  const debt = await getDebt(params.id)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Renegociar Dívida</CardTitle>
        <p className="text-sm text-muted-foreground">
          Cliente: <span className="font-semibold">{debt.customer.name}</span>
        </p>
      </CardHeader>
      <CardContent>
        <DebtRenegotiationForm debt={debt} />
      </CardContent>
    </Card>
  )
}
