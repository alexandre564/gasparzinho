import type React from 'react';
import Link from 'next/link';
import { BarChart3, CalendarDays, CalendarRange } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ReportPeriod } from './actions';

const options: Array<{ value: ReportPeriod; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { value: 'daily', label: 'Dia', icon: CalendarDays },
  { value: 'weekly', label: 'Semana', icon: CalendarRange },
  { value: 'monthly', label: 'Mes', icon: BarChart3 },
  { value: 'yearly', label: 'Ano', icon: BarChart3 },
];

export function PeriodToggle({
  period,
  basePath = '/dashboard/relatorios',
}: {
  period: ReportPeriod;
  basePath?: string;
}) {
  return (
    <div className="inline-flex max-w-full overflow-x-auto rounded-md border border-slate-300 bg-white p-1 shadow-sm">
      {options.map((option) => {
        const Icon = option.icon;
        const active = option.value === period;

        return (
          <Button
            key={option.value}
            asChild
            size="sm"
            variant="ghost"
            className={cn(
              'shrink-0 gap-2 px-3 text-slate-700 hover:bg-slate-100',
              active && 'bg-emerald-700 text-white hover:bg-emerald-700 hover:text-white',
            )}
          >
            <Link href={`${basePath}?period=${option.value}`}>
              <Icon className="h-4 w-4" />
              {option.label}
            </Link>
          </Button>
        );
      })}
    </div>
  );
}
