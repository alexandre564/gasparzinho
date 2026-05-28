import { Suspense } from 'react';
import { Expense } from '@prisma/client';
import { Download, FileSpreadsheet, Loader2, Repeat } from 'lucide-react';
import Link from 'next/link';

import { getPaginatedExpenses } from './actions';
import DeleteExpenseButton from './DeleteExpenseButton';
import { ExpenseCategoryFilter } from './ExpenseCategoryFilter';
import ExpenseForm from './ExpenseForm';
import ImportExpensesButton from './ImportExpensesButton';
import Pagination from '@/components/Pagination';
import { Search } from '@/components/Search';
import { Badge } from '@/components/ui/badge';
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
const currencyFormatter = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

type ExpensesPageProps = {
  searchParams?: {
    query?: string;
    page?: string;
    category?: string;
  };
};

export default async function ExpensesPage({ searchParams }: ExpensesPageProps) {
  const query = searchParams?.query || '';
  const currentPage = Number(searchParams?.page) || 1;
  const category = searchParams?.category;
  const { expenses, totalPages } = await getPaginatedExpenses(query, currentPage, category);
  const exportParams = new URLSearchParams();

  if (query) exportParams.set('query', query);
  if (category) exportParams.set('category', category);

  const exportHref = `/api/financeiro/despesas/exportar${
    exportParams.toString() ? `?${exportParams.toString()}` : ''
  }`;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gerenciamento de despesas</h1>
          <p className="text-sm text-muted-foreground">
            Registre gastos, importe planilhas e acompanhe despesas recorrentes.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href={exportHref}>
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/api/financeiro/despesas/modelo">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Modelo CSV
            </Link>
          </Button>
          <ImportExpensesButton />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <Search placeholder="Buscar por descrição..." />
                <Suspense fallback={<div className="h-11 w-full rounded-md border bg-white sm:max-w-xs" />}>
                  <ExpenseCategoryFilter />
                </Suspense>
              </div>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin" />}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="hidden sm:table-cell">Categoria</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="hidden text-center md:table-cell">Data</TableHead>
                      <TableHead>
                        <span className="sr-only">Ações</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.length > 0 ? (
                      expenses.map((expense: Expense) => (
                        <TableRow key={expense.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {expense.description}
                              {expense.isRecurring && <Repeat className="h-3 w-3 text-muted-foreground" />}
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge variant="outline">{expense.category}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {currencyFormatter(expense.value)}
                          </TableCell>
                          <TableCell className="hidden text-center md:table-cell">
                            {new Date(expense.date).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell className="text-right">
                            <DeleteExpenseButton id={expense.id} />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          Nenhuma despesa encontrada.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Suspense>
            </CardContent>
          </Card>
          <div className="mt-4 flex justify-center">
            <Pagination totalPages={totalPages} />
          </div>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Nova despesa</CardTitle>
              <CardDescription>Adicione uma nova despesa ao sistema.</CardDescription>
            </CardHeader>
            <CardContent>
              <ExpenseForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
