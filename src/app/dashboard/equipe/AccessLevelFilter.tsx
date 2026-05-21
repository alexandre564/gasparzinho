'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { TEAM_ROLES } from './roles';

export function AccessLevelFilter() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const handleRoleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const role = event.target.value;
    const params = new URLSearchParams(searchParams);

    if (role && role !== 'ALL') {
      params.set('role', role);
    } else {
      params.delete('role');
    }

    replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="relative flex-1 flex-shrink-0">
      <label htmlFor="role-filter" className="sr-only">Filtrar por nivel de acesso</label>
      <select
        id="role-filter"
        onChange={handleRoleChange}
        defaultValue={searchParams.get('role')?.toString() || 'ALL'}
        className="block h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-950 shadow-sm"
      >
        <option value="ALL">Todos os niveis</option>
        {TEAM_ROLES.map((role) => (
          <option key={role.value} value={role.value}>
            {role.label}
          </option>
        ))}
      </select>
    </div>
  );
}
