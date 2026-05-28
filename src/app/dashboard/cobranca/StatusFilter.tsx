'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { debtStatusLabels, labelFrom } from '@/lib/labels';

const statuses = ['PENDENTE', 'VENCIDO', 'RENEGOCIADO', 'PAGO'] as const;

export default function StatusFilter() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const handleFilterChange = (status: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', '1');

    if (status && status !== 'TODOS') {
      params.set('status', status);
    } else {
      params.delete('status');
    }

    const queryString = params.toString();
    replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  };

  return (
    <Select onValueChange={handleFilterChange} defaultValue={searchParams.get('status') || 'TODOS'}>
      <SelectTrigger className="h-11 w-full bg-white sm:w-[210px]" aria-label="Filtrar cobranças por status">
        <SelectValue placeholder="Filtrar por status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="TODOS">Todos os status</SelectItem>
        {statuses.map((status) => (
          <SelectItem key={status} value={status}>
            {labelFrom(debtStatusLabels, status)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
