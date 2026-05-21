import Link from "next/link";
import {
  AlertCircle,
  Banknote,
  Building2,
  ClipboardPen,
  Download,
  FileText,
  Home,
  Package,
  Settings,
  ShoppingCart,
  Truck,
  Users2,
} from "lucide-react";
import { auth } from "@/auth";

const navLinks = [
  { href: "/dashboard", icon: Home, label: "Dashboard", roles: ["ADMIN", "VENDEDOR"] },
  { href: "/dashboard/clientes", icon: Users2, label: "Clientes", roles: ["ADMIN", "VENDEDOR"] },
  { href: "/dashboard/vendas", icon: ShoppingCart, label: "Vendas", roles: ["ADMIN", "VENDEDOR"] },
  { href: "/dashboard/estoque", icon: Package, label: "Estoque", roles: ["ADMIN", "VENDEDOR"] },
  { href: "/dashboard/entregas", icon: Truck, label: "Entregas", roles: ["ADMIN", "ENTREGADOR"] },
  { href: "/dashboard/recompra", icon: Building2, label: "Recompra", roles: ["ADMIN", "VENDEDOR"] },
  { href: "/dashboard/cobranca", icon: AlertCircle, label: "Cobranca", roles: ["ADMIN"] },
  { href: "/dashboard/financeiro", icon: Banknote, label: "Financeiro", roles: ["ADMIN"] },
  { href: "/dashboard/relatorios", icon: FileText, label: "Relatorios", roles: ["ADMIN"] },
  { href: "/dashboard/equipe", icon: Users2, label: "Equipe", roles: ["ADMIN"] },
  { href: "/dashboard/frota", icon: Truck, label: "Frota", roles: ["ADMIN"] },
  { href: "/dashboard/fechamento", icon: ClipboardPen, label: "Fechamento", roles: ["ADMIN"] },
];

export default async function Sidebar() {
  const session = await auth();
  const userRole = session?.user?.role?.toUpperCase() || "";
  const filteredNavLinks = navLinks.filter((link) => link.roles.includes(userRole));

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r bg-card lg:flex lg:flex-col">
      <div className="flex h-16 items-center gap-3 border-b px-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Package className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-none">Gas Gasparzinho</p>
          <p className="mt-1 text-xs text-muted-foreground">Gestao de revenda</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {filteredNavLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <link.icon className="h-4 w-4 shrink-0" />
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="space-y-1 border-t p-3">
        <Link
          href="/dashboard/configuracoes"
          className="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Settings className="h-4 w-4" />
          Configuracoes
        </Link>
        <a
          href="/api/backup"
          download
          className="flex h-10 items-center gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-100"
        >
          <Download className="h-4 w-4" />
          Baixar backup
        </a>
      </div>
    </aside>
  );
}