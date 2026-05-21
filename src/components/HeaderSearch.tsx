'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { Search, UserRound, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type CustomerSuggestion = {
  id: string;
  name: string;
  phone: string;
  address: string;
  totalDebt: number;
};

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export function HeaderSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const wrapperRef = useRef<HTMLFormElement>(null);
  const currentQuery = pathname === '/dashboard/clientes' ? searchParams.get('query') ?? '' : '';
  const [value, setValue] = useState(currentQuery);
  const [suggestions, setSuggestions] = useState<CustomerSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setValue(currentQuery);
  }, [currentQuery]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const goToCustomers = (term: string) => {
    const query = term.trim();
    setOpen(false);

    if (!query) {
      if (pathname === '/dashboard/clientes') {
        router.replace('/dashboard/clientes');
      }
      return;
    }

    router.replace(`/dashboard/clientes?query=${encodeURIComponent(query)}&page=1`);
  };


  const goToNewOrder = (customerId: string) => {
    setOpen(false);
    router.push(`/dashboard/vendas/novo?customerId=${customerId}`);
  };
  const fetchSuggestions = useDebouncedCallback(async (term: string) => {
    const query = term.trim();

    if (!query) {
      setSuggestions([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/clientes/sugestoes?q=${encodeURIComponent(query)}`, {
        cache: 'no-store',
      });
      const data = (await response.json()) as { customers?: CustomerSuggestion[] };
      setSuggestions(data.customers ?? []);
      setOpen(true);
    } catch {
      setSuggestions([]);
      setOpen(true);
    } finally {
      setLoading(false);
    }
  }, 180);

  const handleChange = (term: string) => {
    setValue(term);
    setOpen(Boolean(term.trim()));
    fetchSuggestions(term);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    fetchSuggestions.cancel();
    goToCustomers(value);
  };

  const clearSearch = () => {
    fetchSuggestions.cancel();
    setValue('');
    setSuggestions([]);
    setOpen(false);
    if (pathname === '/dashboard/clientes') {
      router.replace('/dashboard/clientes');
    }
  };

  return (
    <form ref={wrapperRef} onSubmit={handleSubmit} className="relative w-full" role="search">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
      <Input
        type="search"
        placeholder="Buscar cliente por nome ou celular..."
        className="h-11 rounded-md border-slate-300 bg-white pl-10 pr-10 text-slate-950 shadow-sm placeholder:text-slate-500 focus-visible:ring-emerald-600"
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        onFocus={() => {
          if (value.trim()) {
            setOpen(true);
            fetchSuggestions(value);
          }
        }}
        autoComplete="off"
      />
      {value ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-slate-500 hover:text-slate-950"
          onClick={clearSearch}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Limpar busca</span>
        </Button>
      ) : null}

      {open && value.trim() ? (
        <div className="absolute right-0 top-12 z-50 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase text-slate-500">
            Clientes encontrados
          </div>
          {loading ? (
            <div className="px-3 py-4 text-sm text-slate-500">Buscando...</div>
          ) : suggestions.length > 0 ? (
            <div className="max-h-80 overflow-y-auto py-1">
              {suggestions.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  className="flex w-full items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-emerald-50"
                  onClick={() => goToNewOrder(customer.id)}
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
                    <UserRound className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-950">{customer.name}</span>
                    <span className="block truncate text-xs text-slate-600">{customer.phone}</span>
                    {customer.address ? (
                      <span className="block truncate text-xs text-slate-500">{customer.address}</span>
                    ) : null}
                  </span>
                  {customer.totalDebt > 0 ? (
                    <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
                      {currency.format(customer.totalDebt)}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          ) : (
            <div className="px-3 py-4 text-sm text-slate-500">Nenhum cliente encontrado.</div>
          )}
          <button
            type="button"
            className="flex w-full items-center justify-center border-t border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
            onClick={() => goToCustomers(value)}
          >
            Ver todos os resultados para &quot;{value.trim()}&quot;
          </button>
        </div>
      ) : null}
    </form>
  );
}