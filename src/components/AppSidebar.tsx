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
  { href: "/dashboard/cobranca", icon: AlertCircle, label: "Cobrança", roles: ["ADMIN"] },
  { href: "/dashboard/financeiro", icon: Banknote, label: "Financeiro", roles: ["ADMIN"] },
  { href: "/dashboard/relatorios", icon: FileText, label: "Relatórios", roles: ["ADMIN"] },
  { href: "/dashboard/equipe", icon: Users2, label: "Equipe", roles: ["ADMIN"] },
  { href: "/dashboard/frota", icon: Truck, label: "Frota", roles: ["ADMIN"] },
  { href: "/dashboard/fechamento", icon: ClipboardPen, label: "Fechamento", roles: ["ADMIN"] },
];

export default async function Sidebar() {
  const session = await auth();
  const userRole = session?.user?.role?.toUpperCase() || "";
  const filteredNavLinks = navLinks.filter((link) => link.roles.includes(userRole));

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-slate-800 bg-slate-950 text-slate-100 shadow-2xl lg:flex lg:flex-col">
      <div className="border-b border-slate-800 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-500 text-white shadow-lg shadow-emerald-950/30">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none text-white">Gás Gasparzinho</p>
            <p className="mt-1 text-xs text-emerald-100/75">Gestão de revenda</p>
          </div>
        </div>
        <div className="mt-4 rounded-lg border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-50">
          Operação, entregas e cobrança em um só painel.
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {filteredNavLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900 text-slate-400 transition-colors group-hover:bg-emerald-500 group-hover:text-white">
              <link.icon className="h-4 w-4 shrink-0" />
            </span>
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="space-y-2 border-t border-slate-800 p-3">
        <Link
          href="/dashboard/configuracoes"
          className="group flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900 text-slate-400 group-hover:bg-emerald-500 group-hover:text-white">
            <Settings className="h-4 w-4" />
          </span>
          Configurações
        </Link>
        <a
          href="/api/backup"
          download
          className="flex h-10 items-center gap-3 rounded-md border border-emerald-400/30 bg-emerald-500 px-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-400"
        >
          <Download className="h-4 w-4" />
          Baixar backup
        </a>
      </div>
    </aside>
  );
}
