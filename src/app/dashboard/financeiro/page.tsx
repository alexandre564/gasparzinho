import { Suspense } from 'react';
import Link from 'next/link';
import { getFinancialSummary, getWeeklyChartData, getPaginatedExpenses } from './despesas/actions';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { ArrowUpRight, ArrowDownRight, ArrowRight, DollarSign, Receipt, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import SalesChart from '@/components/SalesChart'; // Assuming this component is generic enough
import { Expense } from '@prisma/client';

const currencyFormatter = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

function StatCard({ title, value, icon, subtext }: { title: string, value: string, icon: React.ReactNode, subtext?: string }) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {subtext && <p className="text-xs text-muted-foreground">{subtext}</p>}
            </CardContent>
        </Card>
    );
}

async function FinancialSummary() {
    const summary = await getFinancialSummary();
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <StatCard title="Receita (Mês)" value={currencyFormatter(summary.month.revenue)} icon={<TrendingUp className="h-4 w-4 text-muted-foreground"/>} subtext={`Hoje: ${currencyFormatter(summary.today.revenue)}`} />
            <StatCard title="Despesas (Mês)" value={currencyFormatter(summary.month.expenses)} icon={<TrendingDown className="h-4 w-4 text-muted-foreground"/>} subtext={`Hoje: ${currencyFormatter(summary.today.expenses)}`}/>
            <StatCard title="Saldo Líquido (Mês)" value={currencyFormatter(summary.month.net)} icon={<DollarSign className="h-4 w-4 text-muted-foreground"/>} subtext={`Hoje: ${currencyFormatter(summary.today.net)}`}/>
        </div>
    );
}

async function RecentExpenses() {
    const { expenses } = await getPaginatedExpenses('', 1);
    return (
         <Card>
            <CardHeader>
                <CardTitle>Despesas Recentes</CardTitle>
                <CardDescription>Últimas despesas adicionadas.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Descrição</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                            <TableHead className="hidden md:table-cell text-center">Data</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                         {expenses.slice(0, 5).map((expense: Expense) => (
                             <TableRow key={expense.id}>
                                 <TableCell>{expense.description}</TableCell>
                                 <TableCell className="text-right font-mono">{currencyFormatter(expense.value)}</TableCell>
                                 <TableCell className="hidden md:table-cell text-center">{new Date(expense.date).toLocaleDateString('pt-BR')}</TableCell>
                             </TableRow>
                         ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}

async function WeeklyChart() {
    const chartData = await getWeeklyChartData();
    return (
        <Card>
            <CardHeader>
                 <CardTitle>Balanço Semanal</CardTitle>
                 <CardDescription>Receitas e despesas dos últimos 7 dias.</CardDescription>
            </CardHeader>
            <CardContent>
                <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin"/>}>
                     <SalesChart data={chartData} />
                </Suspense>
            </CardContent>
        </Card>
    )
}

export default function FinancialPage() {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Painel Financeiro</h1>
                 <Link href="/dashboard/financeiro/despesas">
                    <Button variant="outline">Gerenciar Despesas <ArrowRight className="ml-2 h-4 w-4"/></Button>
                </Link>
            </div>
           
            <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin"/>}><FinancialSummary /></Suspense>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin"/>}><WeeklyChart /></Suspense>
                <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin"/>}><RecentExpenses /></Suspense>
            </div>
        </div>
    )
}
