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
import type { ClosingCashEntry, ClosingExpense, ClosingSale, StockForecastItem } from './actions';

interface SummaryData {
  totalRevenue: number;
  totalExpenses: number;
  netBalance: number;
  ordersCount: number;
  sales: ClosingSale[];
  cashEntries: ClosingCashEntry[];
  expenses: ClosingExpense[];
  stockForecast: StockForecastItem[];
}

interface Props {
  data: SummaryData;
}

export default function ClosingSummary({ data }: Props) {
  const {
    totalRevenue,
    totalExpenses,
    netBalance,
    ordersCount,
    sales,
    cashEntries,
    expenses,
    stockForecast,
  } = data;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricTile
          title="Entradas do dia"
          value={formatCurrency(totalRevenue)}
          description="Dinheiro recebido hoje: vendas pagas e recebimentos de fiado."
          icon={TrendingUp}
          tone="emerald"
        />
        <MetricTile
          title="Despesas do dia"
          value={formatCurrency(totalExpenses)}
          description="Saidas lancadas no fechamento."
          icon={TrendingDown}
          tone="rose"
        />
        <MetricTile
          title="Saldo liquido"
          value={formatCurrency(netBalance)}
          description="Entradas menos despesas do dia."
          icon={DollarSign}
          tone={netBalance >= 0 ? 'blue' : 'rose'}
        />
        <MetricTile
          title="Vendas pagas"
          value={ordersCount}
          description="Pedidos pagos considerados no caixa."
          icon={Receipt}
          tone="slate"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard
          title="Vendas pagas do dia"
          description="Pedidos pagos no dia. Pedidos fiados entram no caixa apenas quando forem recebidos."
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
                    <EmptyState title="Nenhuma venda paga hoje" description="Vendas pagas aparecem aqui antes do fechamento." />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </SectionCard>

        <SectionCard title="Estoque no fechamento" description="Saldo previsto para apoiar a conferencia operacional.">
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

      <SectionCard title="Recebimentos de fiado" description="Pagamentos de dividas que entraram no caixa hoje.">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Origem</TableHead>
              <TableHead className="hidden sm:table-cell">Categoria</TableHead>
              <TableHead className="text-right">Valor recebido</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cashEntries.length > 0 ? (
              cashEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">{entry.description}</TableCell>
                  <TableCell className="hidden sm:table-cell">{entry.category}</TableCell>
                  <TableCell className="text-right font-semibold text-emerald-700">
                    {formatCurrency(entry.value)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center">
                  <EmptyState title="Nenhum fiado recebido hoje" description="Pagamentos de cobrancas aparecem aqui automaticamente." />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </SectionCard>

      <SectionCard title="Despesas do dia" description="Gastos considerados como saida no fechamento.">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descricao</TableHead>
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
                  <EmptyState title="Nenhuma despesa registrada hoje" description="Gastos lancados no financeiro entram automaticamente no fechamento." />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </SectionCard>
    </div>
  );
}
