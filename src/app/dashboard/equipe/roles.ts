export const TEAM_ROLES = [
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'VENDEDOR', label: 'Vendedor' },
  { value: 'ENTREGADOR', label: 'Entregador' },
] as const;

export const TEAM_ROLE_VALUES = TEAM_ROLES.map((role) => role.value) as [
  'ADMIN',
  'VENDEDOR',
  'ENTREGADOR',
];
