import {
  AlertCircle,
  Banknote,
  Building2,
  ClipboardPen,
  FileText,
  Home,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  Truck,
  Users2,
} from 'lucide-react';

export const roleLabels: Record<string, string> = {
  ADMIN: 'Administrador',
  VENDEDOR: 'Vendedor',
  ENTREGADOR: 'Entregador',
};

export const appNavLinks = [
  { href: '/dashboard', icon: Home, label: 'Página principal', roles: ['ADMIN', 'VENDEDOR', 'ENTREGADOR'] },
  { href: '/dashboard/clientes', icon: Users2, label: 'Clientes', roles: ['ADMIN', 'VENDEDOR'] },
  { href: '/dashboard/vendas', icon: ShoppingCart, label: 'Vendas', roles: ['ADMIN', 'VENDEDOR'] },
  { href: '/dashboard/estoque', icon: Package, label: 'Estoque', roles: ['ADMIN', 'VENDEDOR'] },
  { href: '/dashboard/entregas', icon: Truck, label: 'Entregas', roles: ['ADMIN', 'ENTREGADOR'] },
  { href: '/dashboard/fidelizacao', icon: Building2, label: 'Fidelização', roles: ['ADMIN', 'VENDEDOR'] },
  { href: '/dashboard/cobranca', icon: AlertCircle, label: 'Cobrança', roles: ['ADMIN'] },
  { href: '/dashboard/financeiro', icon: Banknote, label: 'Financeiro', roles: ['ADMIN'] },
  { href: '/dashboard/gastos', icon: Receipt, label: 'Gastos', roles: ['ADMIN'] },
  { href: '/dashboard/relatorios', icon: FileText, label: 'Relatórios', roles: ['ADMIN'] },
  { href: '/dashboard/equipe', icon: Users2, label: 'Equipe', roles: ['ADMIN'] },
  { href: '/dashboard/filiais', icon: Building2, label: 'Filiais', roles: ['ADMIN'] },
  { href: '/dashboard/frota', icon: Truck, label: 'Frota', roles: ['ADMIN'] },
  { href: '/dashboard/fechamento', icon: ClipboardPen, label: 'Fechamento', roles: ['ADMIN'] },
  {
    href: '/dashboard/configuracoes',
    icon: Settings,
    label: 'Configurações',
    roles: ['ADMIN'],
  },
] as const;

export const settingsNavLink = appNavLinks.find((link) => link.href === '/dashboard/configuracoes')!;
export const mainNavLinks = appNavLinks.filter((link) => link.href !== '/dashboard/configuracoes');
