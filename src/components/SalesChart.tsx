'use client';

import { useEffect, useState } from 'react';
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

type TooltipItem = {
  value?: number | string;
  name?: string;
  color?: string;
};

type ChartTooltipProps = {
  active?: boolean;
  label?: string;
  payload?: TooltipItem[];
  labelPrefix: string;
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

function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(query.matches);

    const updatePreference = () => setReducedMotion(query.matches);
    query.addEventListener('change', updatePreference);

    return () => query.removeEventListener('change', updatePreference);
  }, []);

  return reducedMotion;
}

function ChartTooltip({ active, payload, label, labelPrefix }: ChartTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-xl shadow-slate-300/60">
      <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
        {labelPrefix}: {label}
      </p>
      <div className="mt-2 space-y-1.5">
        {payload.map((item) => (
          <div key={`${item.name}-${item.value}`} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2 font-semibold text-slate-700">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color ?? '#047857' }} />
              {item.name === 'Saidas' ? 'Saídas' : item.name}
            </span>
            <span className="font-black text-slate-950">{formatCurrency(Number(item.value ?? 0))}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SalesChart({
  data,
  labelPrefix = 'Dia',
}: {
  data: ChartPoint[];
  labelPrefix?: string;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const chartData = normalizeData(data);
  const hasFinanceSeries = chartData.some(
    (item) => item.Entradas !== undefined || item.Saidas !== undefined
  );
  const animationProps = {
    isAnimationActive: !reducedMotion,
    animationDuration: 520,
    animationEasing: 'ease-out' as const,
  };

  return (
    <div className="motion-safe:animate-soft-slide-up">
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
            cursor={{ fill: 'rgba(16, 185, 129, 0.1)' }}
            content={<ChartTooltip labelPrefix={labelPrefix} />}
          />
          {hasFinanceSeries ? (
            <>
              <Bar
                dataKey="Entradas"
                fill="#047857"
                radius={[6, 6, 0, 0]}
                activeBar={{ fill: '#065f46', stroke: '#022c22', strokeWidth: 1 }}
                {...animationProps}
              />
              <Bar
                dataKey="Saidas"
                name="Saídas"
                fill="#dc2626"
                radius={[6, 6, 0, 0]}
                activeBar={{ fill: '#b91c1c', stroke: '#7f1d1d', strokeWidth: 1 }}
                {...animationProps}
              />
            </>
          ) : (
            <Bar
              dataKey="total"
              name="Vendas"
              fill="#047857"
              radius={[7, 7, 0, 0]}
              activeBar={{ fill: '#065f46', stroke: '#022c22', strokeWidth: 1 }}
              {...animationProps}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
