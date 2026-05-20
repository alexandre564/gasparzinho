import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, parseISO } from "date-fns";
import Link from "next/link";
import { AlertCircle, MessageCircle } from "lucide-react";
import type { DebtStatus } from "@/types/enums";

async function getDebts() {
  const debts = await prisma.debt.findMany({
    where: {
      status: {
        in: ["PENDING", "OVERDUE"],
      },
    },
    include: {
      customer: true,
    },
    orderBy: {
      dueDate: "asc",
    },
  });

  return debts;
}

const formatPhoneForWhatsApp = (phone: string) => phone.replace(/\D/g, "");

const formatWhatsAppMessage = (customerName: string, debtValue: number) => {
  const text = `Olá ${customerName}, sua dívida de R$ ${debtValue.toFixed(2)} está em aberto. Podemos resolver?`;
  return encodeURIComponent(text);
};

export default async function CobrancaPage() {
  const debts = await getDebts();

  const getStatusVariant = (status: DebtStatus) => {
    switch (status) {
      case "OVERDUE":
      case "VENCIDO":
        return "destructive" as const;
      case "PENDING":
      case "PENDENTE":
        return "default" as const;
      case "RENEGOCIADO":
        return "secondary" as const;
      case "PAGO":
        return "success" as const;
      default:
        return "secondary" as const;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cobrança de Dívidas</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Data da Compra</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {debts.map((debt) => (
              <TableRow key={debt.id}>
                <TableCell>{debt.customer.name}</TableCell>
                <TableCell>{debt.customer.phone}</TableCell>
                <TableCell className="text-right">
                  R$ {debt.value.toFixed(2)}
                </TableCell>
                <TableCell>
                  {format(parseISO(debt.createdAt.toISOString()), "dd/MM/yyyy")}
                </TableCell>
                <TableCell>
                  {format(parseISO(debt.dueDate.toISOString()), "dd/MM/yyyy")}
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(debt.status as DebtStatus)}>
                    {debt.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button asChild size="sm" variant="outline">
                    <Link
                      href={`https://wa.me/55${formatPhoneForWhatsApp(debt.customer.phone)}?text=${formatWhatsAppMessage(debt.customer.name, debt.value)}`}
                      target="_blank"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp
                    </Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link href={`/dashboard/cobranca/${debt.id}`}>
                      <AlertCircle className="h-4 w-4 mr-2" /> Renegociar
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {debts.length === 0 && (
          <div className="py-8 text-center text-muted-foreground">
            Nenhuma dívida pendente ou vencida encontrada.
          </div>
        )}
      </CardContent>
    </Card>
  );
}