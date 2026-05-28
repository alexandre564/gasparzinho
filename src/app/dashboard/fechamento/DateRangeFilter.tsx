'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function DateRangeFilter() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const from = searchParams.get('from') ?? '';
  const to = searchParams.get('to') ?? '';

  const update = (key: 'from' | 'to', value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }

    const queryString = params.toString();
    replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  };

  const clear = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('from');
    params.delete('to');
    const queryString = params.toString();
    replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-end">
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
        Até
        <Input
          type="date"
          value={to}
          onChange={(event) => update('to', event.target.value)}
          className="h-10 w-full sm:w-40"
        />
      </label>
      <Button type="button" variant="outline" onClick={clear} className="h-10 sm:mb-0">
        Limpar período
      </Button>
    </div>
  );
}
