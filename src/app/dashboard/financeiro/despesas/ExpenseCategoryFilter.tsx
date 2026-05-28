'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { EXPENSE_CATEGORIES } from './categories';

export function ExpenseCategoryFilter() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const currentCategory = searchParams.get('category') ?? 'TODAS';

  const handleChange = (category: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', '1');

    if (category === 'TODAS') {
      params.delete('category');
    } else {
      params.set('category', category);
    }

    const queryString = params.toString();
    replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  };

  return (
    <label className="flex w-full flex-col gap-1 text-xs font-bold uppercase text-slate-600 sm:max-w-xs">
      Categoria
      <select
        value={currentCategory}
        onChange={(event) => handleChange(event.target.value)}
        className="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold normal-case text-slate-900 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
        aria-label="Filtrar despesas por categoria"
      >
        <option value="TODAS">Todas as categorias</option>
        {EXPENSE_CATEGORIES.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>
    </label>
  );
}
