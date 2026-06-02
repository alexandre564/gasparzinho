import { DollarSign, Receipt, TrendingDown, TrendingUp } from 'lucide-react';

import { EmptyState, MetricTile, SectionCard } from '@/components/PageShell';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils';
import { expenseLabel } from '../financeiro/despesas/categories';
import type { ClosingExpense, ClosingSale, StockForecastItem } from './actions';

interface SummaryData {
  totalRevenue: number;
  totalExpenses: number;
  netBalance: number;
  ordersCount: number;
  sales: ClosingSale[];
  expenses: ClosingExpense[];
  stockForecast: StockForecastItem[];
}

interface Props {
  data: SummaryData;
}

export default function ClosingSummary({ data }: Props) {
  const { totalRevenue, totalExpenses, netBalance, ordersCount, sales, expenses, stockForecast } = data;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricTile
          title="Entradas do dia"
          value={formatCurrency(totalRevenue)}
          description="Total bruto recebido ou vendido no caixa de hoje."
          icon={TrendingUp}
          tone="emerald"
        />
        <MetricTile
          title="Despesas do dia"
          value={formatCurrency(totalExpenses)}
          description="Saídas lançadas no fechamento."
          icon={TrendingDown}
          tone="rose"
        />
        <MetricTile
          title="Saldo líquido"
          value={formatCurrency(netBalance)}
          description="Entradas menos despesas do dia."
          icon={DollarSign}
          tone={netBalance >= 0 ? 'blue' : 'rose'}
        />
        <MetricTile
          title="Total de vendas"
          value={ordersCount}
          description="Pedidos considerados no fechamento."
          icon={Receipt}
          tone="slate"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard
          title="Vendas do dia"
          description="Entradas e lucro líquido dos pedidos usados no fechamento."
          className="lg:col-span-2"
        >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Entrada</TableHead>
                  <TableHead className="text-right">Lucro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.length > 0 ? (
                  sales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>{sale.customer.name}</TableCell>
                      <TableCell className="text-right">{formatCurrency(sale.grossValue)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(sale.netValue)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center">
                      <EmptyState title="Nenhuma venda registrada hoje" description="As vendas confirmadas aparecem aqui antes do fechamento." />
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
        </SectionCard>

        <SectionCard title="Estoque no fechamento" description="Saldo previsto para apoiar a conferência operacional.">
            <div className="space-y-2">
              {stockForecast.map((item) => (
                <div key={item.name} className="interactive-lift flex justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                  <span className="font-semibold text-slate-800">{item.name}</span>
                  <strong className="text-slate-950">{item.units}</strong>
                </div>
              ))}
            </div>
        </SectionCard>
      </div>

      <SectionCard title="Despesas do dia" description="Gastos considerados como saída no fechamento.">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead className="hidden sm:table-cell">Categoria</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.length > 0 ? (
                expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="font-medium">{expense.description}</TableCell>
                    <TableCell className="hidden sm:table-cell">{expenseLabel(expense.category)}</TableCell>
                    <TableCell className="text-right text-red-700">
                      {formatCurrency(expense.value)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">
                    <EmptyState title="Nenhuma despesa registrada hoje" description="Gastos lançados no financeiro entram automaticamente no fechamento." />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
      </SectionCard>
    </div>
  );
}
