'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const categories = ['BOTIJAO', 'AGUA', 'ACESSORIO', 'OUTROS'];

export function CategoryFilter() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const currentCategory = searchParams.get('category');

  const handleValueChange = (category: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', '1');

    if (category && category !== 'ALL') {
      params.set('category', category);
    } else {
      params.delete('category');
    }

    replace(`${pathname}?${params.toString()}`);
  };

  return (
    <Select onValueChange={handleValueChange} defaultValue={currentCategory || 'ALL'}>
      <SelectTrigger className="w-full lg:w-[220px]">
        <SelectValue placeholder="Categoria" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL">Todas as categorias</SelectItem>
        {categories.map((category) => (
          <SelectItem key={category} value={category}>
            {category}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}