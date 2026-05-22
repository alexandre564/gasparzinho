'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Search as SearchIcon, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function Search({ placeholder }: { placeholder: string }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const currentQuery = searchParams.get('query')?.toString() ?? '';
  const [value, setValue] = useState(currentQuery);

  useEffect(() => {
    setValue(currentQuery);
  }, [currentQuery]);

  const updateSearch = (term: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', '1');

    if (term.trim()) {
      params.set('query', term.trim());
    } else {
      params.delete('query');
    }

    const queryString = params.toString();
    replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  };

  const debouncedSearch = useDebouncedCallback(updateSearch, 200);

  const handleChange = (term: string) => {
    setValue(term);
    debouncedSearch(term);
  };

  const handleClear = () => {
    debouncedSearch.cancel();
    setValue('');
    updateSearch('');
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    debouncedSearch.cancel();
    updateSearch(value);
  };

  return (
    <form className="relative w-full max-w-xl" role="search" onSubmit={handleSubmit}>
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      <Input
        type="search"
        name="query"
        placeholder={placeholder}
        className="h-11 rounded-md border-slate-300 bg-white pl-10 pr-10 text-slate-950 shadow-sm placeholder:text-slate-500 focus-visible:ring-emerald-600"
        onChange={(event) => handleChange(event.target.value)}
        value={value}
      />
      {value ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-slate-500 hover:text-slate-950"
          onClick={handleClear}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Limpar busca</span>
        </Button>
      ) : null}
    </form>
  );
}
