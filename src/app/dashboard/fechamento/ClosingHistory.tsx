import { format } from 'date-fns';

import { EmptyState } from '@/components/PageShell';
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
              <TableCell className="font-semibold">{format(item.date, 'dd/MM/yyyy')}</TableCell>
              <TableCell className="text-center">{item.ordersCount}</TableCell>
              <TableCell className="text-right font-mono text-emerald-700">
                {formatCurrency(item.totalRevenue)}
              </TableCell>
              <TableCell className="text-right font-mono text-red-700">
                {formatCurrency(item.totalExpenses)}
              </TableCell>
              <TableCell className={`text-right font-mono font-semibold ${item.netBalance >= 0 ? 'text-slate-900' : 'text-red-700'}`}>
                {formatCurrency(item.netBalance)}
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={5} className="text-center">
              <EmptyState title="Nenhum fechamento anterior encontrado" description="Quando o caixa for fechado, o histórico aparecerá aqui." />
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
