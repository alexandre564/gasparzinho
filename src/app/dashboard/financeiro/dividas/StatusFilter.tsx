'use client';

import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DebtStatus } from './types';

const statuses: DebtStatus[] = ['PENDENTE', 'VENCIDO', 'RENEGOCIADO', 'PAGO'];

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

    replace(`${pathname}?${params.toString()}`);
  };

  return (
    <Select
      onValueChange={handleFilterChange}
      defaultValue={searchParams.get('status') || 'TODOS'}
    >
      <SelectTrigger className="w-full sm:w-[180px]">
        <SelectValue placeholder="Filtrar por status..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="TODOS">Todos os status</SelectItem>
        {statuses.map((status) => (
          <SelectItem key={status} value={status}>
            {status.charAt(0).toUpperCase() +
              status.slice(1).toLowerCase().replace('_', ' ')}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
