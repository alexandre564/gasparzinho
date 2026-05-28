'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function ExpenseDateRangeFilter() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const from = searchParams.get('from') ?? '';
  const to = searchParams.get('to') ?? '';

  const update = (key: 'from' | 'to', value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', '1');

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
    params.set('page', '1');
    params.delete('from');
    params.delete('to');
    const queryString = params.toString();
    replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  };

  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
      <label className="grid gap-1 text-xs font-bold uppercase text-slate-600">
        De
        <Input type="date" value={from} onChange={(event) => update('from', event.target.value)} />
      </label>
      <label className="grid gap-1 text-xs font-bold uppercase text-slate-600">
        Até
        <Input type="date" value={to} onChange={(event) => update('to', event.target.value)} />
      </label>
      <Button type="button" variant="outline" onClick={clear} className="self-end">
        Limpar
      </Button>
    </div>
  );
}
