'use client';

import { useSearchParams, usePathname, useRouter } from 'next/navigation';

export function AccessLevelFilter() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const handlestringChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const accessLevel = e.target.value;
    const params = new URLSearchParams(searchParams);

    if (accessLevel && accessLevel !== 'ALL') {
      params.set('accessLevel', accessLevel);
    } else {
      params.delete('accessLevel');
    }
    replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="relative flex-1 flex-shrink-0">
      <label htmlFor="accessLevel-filter" className="sr-only">Filtrar por nível de acesso</label>
      <select
        id="accessLevel-filter"
        onChange={handlestringChange}
        defaultValue={searchParams.get('accessLevel')?.toString() || 'ALL'}
        className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-4 text-sm outline-2 h-full bg-white"
      >
        <option value="ALL">Todos os Níveis de Acesso</option>
        {['ADMIN','GERENTE','VENDEDOR','OPERADOR'].map((level) => (
          <option key={level} value={level}>
            {level}
          </option>
        ))}
      </select>
    </div>
  );
}
