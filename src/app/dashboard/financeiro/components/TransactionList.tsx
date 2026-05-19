'use client';

import { Transaction } from '@prisma/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from '@/lib/utils';

type TransactionListProps = {
    transactions: Transaction[];
}

export function TransactionList({ transactions }: TransactionListProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Histórico de Transações</CardTitle>
            </CardHeader>
            <CardContent>
                 <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Descrição</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Data</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {transactions.map((transaction) => (
                            <TableRow key={transaction.id}>
                                <TableCell>{transaction.description}</TableCell>
                                <TableCell className={transaction.type === 'REVENUE' ? 'text-green-600' : 'text-red-600'}>
                                    {formatCurrency(Number(transaction.amount))}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={transaction.type === 'REVENUE' ? 'default' : 'destructive'}>
                                        {transaction.type === 'REVENUE' ? 'Receita' : 'Despesa'}
                                    </Badge>
                                </TableCell>
                                <TableCell>{new Date(transaction.date).toLocaleDateString('pt-BR')}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
