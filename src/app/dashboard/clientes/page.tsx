
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, File, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import {Search} from "@/components/Search";
import Pagination from "@/components/Pagination";
import { getPaginatedCustomers } from "./actions";
import { format, formatDistanceToNow, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import DeleteCustomerButton from "./DeleteCustomerButton";


const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export default async function CustomersPage({ searchParams }: { searchParams?: { query?: string; page?: string; } }) {
  const query = searchParams?.query || '';
  const currentPage = Number(searchParams?.page) || 1;

  const { customers, totalPages } = await getPaginatedCustomers(query, currentPage);

  const getDaysColor = (days: number | null) => {
    if (days === null) return 'bg-gray-500';
    if (days <= 7) return 'bg-green-500';
    if (days <= 15) return 'bg-yellow-500';
    if (days <= 30) return 'bg-orange-500';
    return 'bg-red-500';
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Clientes</h1>
         <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-8 gap-1">
                <File className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Exportar</span>
            </Button>
            <Link href="/dashboard/clientes/novo">
                <Button size="sm" className="h-8 gap-1">
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Novo Cliente</span>
                </Button>
            </Link>
        </div>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>Lista de Clientes</CardTitle>
            <CardDescription>Gerencie seus clientes e visualize seus históricos de compras.</CardDescription>
            <div className="pt-4">
                 <Search placeholder="Buscar por nome ou telefone..." />
            </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead className="hidden md:table-cell">Cidade</TableHead>
                <TableHead className="hidden lg:table-cell">Última Compra</TableHead>
                <TableHead className="hidden lg:table-cell">Dias Sem Comprar</TableHead>
                <TableHead className="text-right">Dívida</TableHead>
                <TableHead><span className="sr-only">Ações</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.length > 0 ? customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <div className="font-medium">{customer.name}</div>
                    <div className="hidden text-sm text-muted-foreground md:inline">{customer.phone}</div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{customer.city}</TableCell>
                   <TableCell className="hidden lg:table-cell">
                    {customer.lastPurchase ? format(new Date(customer.lastPurchase), 'dd/MM/yyyy') : 'N/A'}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {customer.daysSinceLastPurchase !== null ? (
                      <Badge variant="default" className={`${getDaysColor(customer.daysSinceLastPurchase)} text-white`}>
                          {customer.daysSinceLastPurchase} dias
                      </Badge>
                     ) : (
                      <Badge variant="secondary">Novo</Badge>
                     )}
                  </TableCell>
                  <TableCell className={`text-right font-semibold ${customer.totalDebt > 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {formatCurrency(customer.totalDebt)}
                  </TableCell>
                  <TableCell className="text-right">
                     <div className="flex justify-end gap-2">
                          <Link href={`/dashboard/clientes/${customer.id}/editar`}>
                            <Button variant="outline" size="icon" className="h-8 w-8">
                                <Pencil className="h-4 w-4"/>
                                <span className="sr-only">Editar</span>
                            </Button>
                           </Link>
                           <DeleteCustomerButton id={customer.id} />
                     </div>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                        Nenhum cliente encontrado.
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
       <div className="flex justify-center">
           <Pagination totalPages={totalPages} />
      </div>
    </div>
  );
}
