'use client';

import { useSearchParams, usePathname, useRouter } from 'next/navigation';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CategoryFilter() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const currentCategory = searchParams.get('category');

  const handleValueChange = (category: string) => {
    const params = new URLSearchParams(searchParams);
    if (category && category !== 'ALL') {
      params.set('category', category);
    } else {
      params.delete('category');
    }
    replace(`${pathname}?${params.toString()}`);
  };

  return (
    <Select onValueChange={handleValueChange} defaultValue={currentCategory || 'ALL'}>
        <SelectTrigger className="w-full md:w-[240px]">
            <SelectValue placeholder="Filtrar por categoria..." />
        </SelectTrigger>
        <SelectContent>
            <SelectItem value="ALL">Todas as Categorias</SelectItem>
            {['GAS','AGUA','REFIL','OUTROS'].map((cat) => (
                <SelectItem key={cat} value={cat}>
                    {cat} 
                </SelectItem>
            ))}
        </SelectContent>
    </Select>
  );
}
