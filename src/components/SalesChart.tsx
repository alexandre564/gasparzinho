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
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#d8e0ea" />
        <XAxis
          dataKey="name"
          tickLine={false}
          axisLine={false}
          tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }}
          tickFormatter={(value) => `R$ ${value}`}
          width={64}
        />
        <Tooltip
          cursor={{ fill: '#ecfdf5' }}
          contentStyle={{
            border: '1px solid #94a3b8',
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
            <Bar dataKey="Entradas" fill="#047857" radius={[6, 6, 0, 0]} />
            <Bar dataKey="Saidas" name="Saídas" fill="#dc2626" radius={[6, 6, 0, 0]} />
          </>
        ) : (
          <Bar dataKey="total" name="Vendas" fill="#047857" radius={[7, 7, 0, 0]} />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}
