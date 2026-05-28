'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type ChartPoint = {
  name: string;
  total?: number;
  Entradas?: number;
  Saidas?: number;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

function normalizeData(data: ChartPoint[]) {
  return data.map((item) => ({
    ...item,
    Saidas: item.Saidas,
  }));
}

export default function SalesChart({
  data,
  labelPrefix = 'Dia',
}: {
  data: ChartPoint[];
  labelPrefix?: string;
}) {
  const chartData = normalizeData(data);
  const hasFinanceSeries = chartData.some(
    (item) => item.Entradas !== undefined || item.Saidas !== undefined
  );

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" />
        <XAxis
          dataKey="name"
          tickLine={false}
          axisLine={false}
          tick={{ fill: '#475569', fontSize: 13 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: '#475569', fontSize: 13 }}
          tickFormatter={(value) => `R$ ${value}`}
          width={64}
        />
        <Tooltip
          cursor={{ fill: '#f1f5f9' }}
          contentStyle={{
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            boxShadow: '0 10px 30px rgb(15 23 42 / 0.12)',
          }}
          formatter={(value, name) => [
            formatCurrency(Number(value)),
            name === 'Saidas' ? 'Saídas' : name,
          ]}
          labelFormatter={(label) => `${labelPrefix}: ${label}`}
        />
        {hasFinanceSeries ? (
          <>
            <Bar dataKey="Entradas" fill="#047857" radius={[5, 5, 0, 0]} />
            <Bar dataKey="Saidas" name="Saídas" fill="#dc2626" radius={[5, 5, 0, 0]} />
          </>
        ) : (
          <Bar dataKey="total" name="Vendas" fill="#047857" radius={[5, 5, 0, 0]} />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}
