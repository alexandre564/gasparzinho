import { format } from 'date-fns';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';

interface Closing {
  id: string;
  date: Date;
  totalRevenue: number;
  totalExpenses: number;
  netBalance: number;
  ordersCount: number;
}

interface Props {
  history: Closing[];
}

export default function ClosingHistory({ history }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Historico de fechamentos</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead className="text-center">Vendas</TableHead>
              <TableHead className="text-right">Entradas</TableHead>
              <TableHead className="text-right">Despesas</TableHead>
              <TableHead className="text-right">Saldo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.length > 0 ? (
              history.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{format(item.date, 'dd/MM/yyyy')}</TableCell>
                  <TableCell className="text-center">{item.ordersCount}</TableCell>
                  <TableCell className="text-right text-green-600">
                    {formatCurrency(item.totalRevenue)}
                  </TableCell>
                  <TableCell className="text-right text-red-600">
                    {formatCurrency(item.totalExpenses)}
                  </TableCell>
                  <TableCell className={`text-right font-semibold ${item.netBalance >= 0 ? 'text-gray-800' : 'text-red-700'}`}>
                    {formatCurrency(item.netBalance)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  Nenhum fechamento anterior encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
