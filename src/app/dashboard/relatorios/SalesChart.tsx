'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MonthlySalesData } from './actions';

interface SalesChartProps {
  data: MonthlySalesData[];
}

export function SalesChart({ data }: SalesChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Vendas Mensais</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip
              formatter={(value) => {
                const numericValue =
                  typeof value === 'number'
                    ? value
                    : Number(value ?? 0);

                return new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(numericValue);
              }}
            />
            <Legend />
            <Bar dataKey="total" fill="#8884d8" name="Total de Vendas" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
