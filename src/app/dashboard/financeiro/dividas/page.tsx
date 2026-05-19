import { Suspense } from 'react';
import { getPaginatedDebts, getTotalOpenDebt } from '../../actions';
import type { Debt } from '@prisma/client';
import type { DebtStatus } from './types';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Pagination from '@/components/Pagination';
import { Search } from '@/components/Search';
import { Loader2, MessageCircle } from 'lucide-react';

import StatusFilter from './StatusFilter';
import MarkAsPaidButton from './MarkAsPaidButton';

const getStatusVariant = (status: string): BadgeProps['variant'] => {
  switch (status) {
    case 'PAGA':
      return 'default';
    case 'PENDENTE':
    case 'ATRASADA':
      return 'destructive';
    case 'RENEGOCIADA':
      return 'secondary';
    default:
      return 'outline';
  }
};

const WhatsAppButton = ({ phone, name }: { phone: string; name: string }) => {
  const cleanPhone = phone.replace(/\D/g, '');
  const message = `Olá ${name}, tudo bem? Estou entrando em contato sobre uma pendência em aberto.`;
  const url = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`;

  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      <Button variant="outline" size="sm">
        <MessageCircle className="h-4 w-4" />
      </Button>
    </a>
  );
};

async function TotalOpenDebtCard() {
  const { totalOpen } = await getTotalOpenDebt();

  return (
    <Card className="bg-destructive text-destructive-foreground">
      <CardHeader>
        <CardTitle>Total em aberto</CardTitle>
        <CardDescription className="text-destructive-foreground/80">
          Soma de todas as dívidas pendentes e atrasadas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">
          {new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          }).format(totalOpen)}
        </p>
      </CardContent>
    </Card>
  );
}

type PageProps = {
  searchParams?: {
    query?: string;
    page?: string;
    status?: string;
  };
};

export default async function Page({ searchParams }: PageProps) {
  const query = searchParams?.query ?? '';
  const currentPage = Number(searchParams?.page ?? '1');
  const status = searchParams?.status as DebtStatus | undefined;

  const { debts, totalPages } = await getPaginatedDebts(query, currentPage, status);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Gestão de Dívidas</h1>

      <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin" />}>
        <TotalOpenDebtCard />
      </Suspense>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <Search placeholder="Buscar por cliente..." />
            <StatusFilter />
          </div>
        </CardHeader>

        <CardContent>
          <Suspense
            fallback={
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            }
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-center hidden md:table-cell">
                    Data Compra
                  </TableHead>
                  <TableHead className="text-center hidden lg:table-cell">
                    Vencimento
                  </TableHead>
                  <TableHead>
                    <span className="sr-only">Ações</span>
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {debts.length > 0 ? (
                  debts.map((debt: Debt & { customer: { name: string; phone: string } }) => (
                    <TableRow key={debt.id}>
                      <TableCell className="font-medium">{debt.customer.name}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={getStatusVariant(debt.status)}>{debt.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(debt.value)}
                      </TableCell>
                      <TableCell className="text-center hidden md:table-cell">
                        {new Date(debt.createdAt).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-center hidden lg:table-cell">
                        {new Date(debt.dueDate).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <WhatsAppButton
                            phone={debt.customer.phone}
                            name={debt.customer.name}
                          />
                          {debt.status !== 'PAGA' && <MarkAsPaidButton id={debt.id} />}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      Nenhuma dívida encontrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Suspense>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        {totalPages > 1 && <Pagination totalPages={totalPages} />}
      </div>
    </div>
  );
}