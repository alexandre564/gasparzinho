import Link from "next/link";
import {
  Home,
  ShoppingCart,
  Package,
  Users2,
  LineChart,
  Settings,
  Truck,
  Building2,
  Banknote,
  FileText,
  ClipboardPen,
  AlertCircle,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { auth } from "@/auth"; // Importando a função auth

// Definição dos papéis e seus links permitidos
const navLinks = [
  { href: "/dashboard", icon: Home, label: "Dashboard", roles: ["ADMIN", "VENDEDOR"] },
  { href: "/dashboard/clientes", icon: Users2, label: "Clientes", roles: ["ADMIN", "VENDEDOR"] },
  { href: "/dashboard/vendas", icon: ShoppingCart, label: "Vendas", roles: ["ADMIN", "VENDEDOR"] },
  { href: "/dashboard/estoque", icon: Package, label: "Estoque", roles: ["ADMIN", "VENDEDOR"] },
  { href: "/dashboard/recompra", icon: Building2, label: "Recompra", roles: ["ADMIN", "VENDEDOR"] },
  { href: "/dashboard/frota", icon: Truck, label: "Frota", roles: ["ADMIN"] },
  { href: "/dashboard/cobranca", icon: AlertCircle, label: "Cobrança", roles: ["ADMIN"] },
  { href: "/dashboard/equipe", icon: Users2, label: "Equipe", roles: ["ADMIN"] },
  { href: "/dashboard/financeiro", icon: Banknote, label: "Financeiro", roles: ["ADMIN"] },
  { href: "/dashboard/relatorios", icon: FileText, label: "Relatórios", roles: ["ADMIN"] },
  { href: "/dashboard/entregas", icon: Truck, label: "Entregas", roles: ["ADMIN", "ENTREGADOR"] },
  { href: "/dashboard/fechamento", icon: ClipboardPen, label: "Fechamento", roles: ["ADMIN"] },
];

export default async function Sidebar() {
  const session = await auth();
  const userRole = session?.user?.role?.toUpperCase() || "";

  const filteredNavLinks = navLinks.filter(link => link.roles.includes(userRole));

  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
      <TooltipProvider>
        <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
          <Link href="#" className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base">
            <Package className="h-4 w-4 transition-all group-hover:scale-110" />
            <span className="sr-only">Gás Gasparzinho</span>
          </Link>
          {filteredNavLinks.map(link => (
            <Tooltip key={link.href}>
              <TooltipTrigger asChild>
                <Link href={link.href} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8">
                  <link.icon className="h-5 w-5" />
                  <span className="sr-only">{link.label}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{link.label}</TooltipContent>
            </Tooltip>
          ))}
        </nav>
        <nav className="mt-auto flex flex-col items-center gap-4 px-2 sm:py-5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="#" className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8">
                <Settings className="h-5 w-5" />
                <span className="sr-only">Configurações</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Configurações</TooltipContent>
          </Tooltip>
        </nav>
      </TooltipProvider>
    </aside>
  );
}
