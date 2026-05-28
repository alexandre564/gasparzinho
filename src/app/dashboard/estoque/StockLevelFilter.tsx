'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const STOCK_LEVELS = [
  { value: 'SEM_ESTOQUE', label: 'Sem estoque' },
  { value: 'CRITICO', label: 'Estoque critico' },
  { value: 'BAIXO', label: 'Estoque baixo' },
  { value: 'DISPONIVEL', label: 'Disponivel' },
];

export function StockLevelFilter() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  function handleStockChange(stock: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (stock && stock !== 'ALL') {
      params.set('stock', stock);
    } else {
      params.delete('stock');
    }

    params.set('page', '1');
    replace(`${pathname}?${params.toString()}`);
  }

  return (
    <Select defaultValue={searchParams.get('stock') || 'ALL'} onValueChange={handleStockChange}>
      <SelectTrigger className="w-full sm:w-[180px]" aria-label="Filtrar por nivel de estoque">
        <SelectValue placeholder="Nivel de estoque" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL">Todos os saldos</SelectItem>
        {STOCK_LEVELS.map((level) => (
          <SelectItem key={level.value} value={level.value}>
            {level.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
