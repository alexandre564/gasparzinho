'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { vehicleStatusLabels, vehicleTypeLabels, labelFrom } from '@/lib/labels';

const vehicleStatuses = ['ATIVO', 'MANUTENCAO', 'INATIVO'] as const;
const vehicleTypes = ['MOTO', 'CARRO', 'VAN', 'CAMINHAO'] as const;

export default function VehicleFilters() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const status = searchParams.get('status') ?? 'TODOS';
  const type = searchParams.get('type') ?? 'TODOS';

  const update = (key: 'status' | 'type', value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value === 'TODOS') {
      params.delete(key);
    } else {
      params.set(key, value);
    }

    const queryString = params.toString();
    replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  };

  const clear = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('status');
    params.delete('type');
    const queryString = params.toString();
    replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  };

  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] lg:max-w-2xl">
      <label className="grid gap-1 text-xs font-bold uppercase text-slate-600">
        Status
        <select
          value={status}
          onChange={(event) => update('status', event.target.value)}
          className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold normal-case text-slate-900 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
          aria-label="Filtrar frota por status"
        >
          <option value="TODOS">Todos os status</option>
          {vehicleStatuses.map((item) => (
            <option key={item} value={item}>
              {labelFrom(vehicleStatusLabels, item)}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-xs font-bold uppercase text-slate-600">
        Tipo
        <select
          value={type}
          onChange={(event) => update('type', event.target.value)}
          className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold normal-case text-slate-900 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
          aria-label="Filtrar frota por tipo"
        >
          <option value="TODOS">Todos os tipos</option>
          {vehicleTypes.map((item) => (
            <option key={item} value={item}>
              {labelFrom(vehicleTypeLabels, item)}
            </option>
          ))}
        </select>
      </label>
      <Button type="button" variant="outline" onClick={clear} className="self-end">
        Limpar filtros
      </Button>
    </div>
  );
}
