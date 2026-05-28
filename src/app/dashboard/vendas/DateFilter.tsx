'use client';

import { useState } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export function DateFilter() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const initialDateParam = searchParams.get('date');
  const initialDate = initialDateParam ? new Date(initialDateParam) : undefined;

  const [date, setDate] = useState<Date | undefined>(
    initialDate && !Number.isNaN(initialDate.getTime()) ? initialDate : undefined
  );

  const handleDateChange = (selectedDate: Date | undefined) => {
    setDate(selectedDate);

    const params = new URLSearchParams(searchParams.toString());

    if (selectedDate) {
      params.set('date', format(selectedDate, 'yyyy-MM-dd'));
    } else {
      params.delete('date');
    }

    params.set('page', '1');

    replace(`${pathname}?${params.toString()}`);
  };

  const clearDate = () => {
    setDate(undefined);

    const params = new URLSearchParams(searchParams.toString());
    params.delete('date');
    params.set('page', '1');

    replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex w-full gap-2 sm:w-auto">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={`w-full justify-start text-left font-normal sm:w-[240px] ${
              !date ? 'text-muted-foreground' : ''
            }`}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, 'PPP', { locale: ptBR }) : <span>Selecione uma data</span>}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-auto p-0">
          <Calendar mode="single" selected={date} onSelect={handleDateChange} />
        </PopoverContent>
      </Popover>
      {date ? (
        <Button type="button" variant="outline" size="icon" onClick={clearDate} aria-label="Limpar data">
          <X className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}
