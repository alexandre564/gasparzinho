export const dashboardRoutePermissions = [
  { prefix: '/dashboard/cobranca', roles: ['ADMIN'] },
  { prefix: '/dashboard/financeiro', roles: ['ADMIN'] },
  { prefix: '/dashboard/relatorios', roles: ['ADMIN'] },
  { prefix: '/dashboard/equipe', roles: ['ADMIN'] },
  { prefix: '/dashboard/filiais', roles: ['ADMIN'] },
  { prefix: '/dashboard/frota', roles: ['ADMIN'] },
  { prefix: '/dashboard/fechamento', roles: ['ADMIN'] },
  { prefix: '/dashboard/gastos', roles: ['ADMIN'] },
  { prefix: '/dashboard/configuracoes', roles: ['ADMIN'] },
  { prefix: '/dashboard/clientes', roles: ['ADMIN', 'VENDEDOR'] },
  { prefix: '/dashboard/vendas', roles: ['ADMIN', 'VENDEDOR'] },
  { prefix: '/dashboard/estoque', roles: ['ADMIN', 'VENDEDOR'] },
  { prefix: '/dashboard/fidelizacao', roles: ['ADMIN', 'VENDEDOR'] },
  { prefix: '/dashboard/recompra', roles: ['ADMIN', 'VENDEDOR'] },
  { prefix: '/dashboard/entregas', roles: ['ADMIN', 'ENTREGADOR'] },
  { prefix: '/dashboard', roles: ['ADMIN', 'VENDEDOR', 'ENTREGADOR'] },
] as const;

export function canAccessPath(pathname: string, role?: string | null) {
  const normalizedRole = role?.toUpperCase();
  const permission = dashboardRoutePermissions.find((route) => pathname.startsWith(route.prefix));

  if (!permission) {
    return true;
  }

  return normalizedRole ? (permission.roles as readonly string[]).includes(normalizedRole) : false;
}
