'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type PeriodMode = 'today' | 'week' | 'month' | 'custom';

const periodOptions: { value: PeriodMode; label: string }[] = [
  { value: 'today', label: 'Hoje' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mes' },
  { value: 'custom', label: 'Personalizado' },
];

export default function DateRangeFilter({ resetPage = false }: { resetPage?: boolean }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const from = searchParams.get('from') ?? '';
  const to = searchParams.get('to') ?? '';
  const rawPeriod = searchParams.get('period');
  const activePeriod: PeriodMode =
    rawPeriod === 'today' || rawPeriod === 'month' || rawPeriod === 'custom'
      ? rawPeriod
      : 'week';

  const navigate = (params: URLSearchParams) => {
    const queryString = params.toString();
    replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  };

  const selectPeriod = (period: PeriodMode) => {
    const params = new URLSearchParams(searchParams.toString());

    if (resetPage) {
      params.set('page', '1');
    }

    if (period === 'week') {
      params.delete('period');
    } else {
      params.set('period', period);
    }

    if (period !== 'custom') {
      params.delete('from');
      params.delete('to');
    }

    navigate(params);
  };

  const update = (key: 'from' | 'to', value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (resetPage) {
      params.set('page', '1');
    }

    params.set('period', 'custom');

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    navigate(params);
  };

  const clear = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('from');
    params.delete('to');
    params.delete('period');
    if (resetPage) {
      params.set('page', '1');
    }
    navigate(params);
  };

  return (
    <div className="space-y-3">
      <div
        className="inline-flex w-full flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 shadow-inner sm:w-auto"
        role="tablist"
        aria-label="Periodo do dashboard"
      >
        {periodOptions.map((option) => {
          const active = activePeriod === option.value;

          return (
            <Button
              key={option.value}
              type="button"
              variant="ghost"
              role="tab"
              aria-selected={active}
              onClick={() => selectPeriod(option.value)}
              className={`h-9 flex-1 rounded-lg px-3 text-xs font-extrabold uppercase tracking-wide transition sm:flex-none ${
                active
                  ? 'bg-slate-950 text-white shadow-sm hover:bg-slate-900 hover:text-white'
                  : 'text-slate-700 hover:bg-white hover:text-slate-950'
              }`}
            >
              {option.label}
            </Button>
          );
        })}
      </div>

      {activePeriod === 'custom' ? (
        <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 shadow-sm sm:flex-row sm:items-end">
          <label className="grid gap-1 text-xs font-bold uppercase text-slate-600">
            De
            <Input
              type="date"
              value={from}
              onChange={(event) => update('from', event.target.value)}
              className="h-10 w-full sm:w-40"
            />
          </label>
          <label className="grid gap-1 text-xs font-bold uppercase text-slate-600">
            Ate
            <Input
              type="date"
              value={to}
              onChange={(event) => update('to', event.target.value)}
              className="h-10 w-full sm:w-40"
            />
          </label>
          <Button type="button" variant="outline" onClick={clear} className="h-10 sm:mb-0">
            Limpar periodo
          </Button>
        </div>
      ) : null}
    </div>
  );
}
