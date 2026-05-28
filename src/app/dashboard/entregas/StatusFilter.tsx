'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { DeliveryStatus } from '@/types/enums';
import { deliveryStatusLabels, labelFrom } from '@/lib/labels';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


export default function StatusFilter() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const handleFilterChange = (status: string) => {
    const params = new URLSearchParams(searchParams);

    if (status && status !== 'TODOS') {
      params.set('status', status);
    } else {
      params.delete('status');
    }

    params.set('page', '1');
    replace(`${pathname}?${params.toString()}`);
  };

  return (
    <Select onValueChange={handleFilterChange} defaultValue={searchParams.get('status') || 'TODOS'}>
      <SelectTrigger className="w-full sm:w-[180px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="TODOS">Todos os status</SelectItem>
        {Object.values(DeliveryStatus).map((status) => (
          <SelectItem key={status} value={status}>
            {labelFrom(deliveryStatusLabels, status)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
