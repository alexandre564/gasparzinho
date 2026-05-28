import { Suspense } from 'react';
import { Expense } from '@prisma/client';
import { Loader2, Repeat } from 'lucide-react';

import { getPaginatedExpenses } from './actions';
import DeleteExpenseButton from './DeleteExpenseButton';
import ExpenseForm from './ExpenseForm';
import Pagination from '@/components/Pagination';
import { Search } from '@/components/Search';
import { Badge } from '@/components/ui/badge';
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

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Gerenciamento de despesas</h1>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <Search placeholder="Buscar por descrição..." />
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
                        <span className="sr-only">Acoes</span>
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
