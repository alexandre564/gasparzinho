import Link from "next/link";
import {
  Bell,
  CircleUser,
  Download,
  Home,
  Menu,
  Package,
  Settings,
  ShoppingCart,
  Truck,
  Users,
} from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { HeaderSearch } from "@/components/HeaderSearch";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const mobileLinks = [
  { href: "/dashboard", icon: Home, label: "Pagina principal" },
  { href: "/dashboard/clientes", icon: Users, label: "Clientes" },
  { href: "/dashboard/vendas", icon: ShoppingCart, label: "Vendas" },
  { href: "/dashboard/estoque", icon: Package, label: "Estoque" },
  { href: "/dashboard/entregas", icon: Truck, label: "Entregas" },
  { href: "/dashboard/configuracoes", icon: Settings, label: "Configuracoes" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 shadow-sm backdrop-blur lg:pl-6 lg:pr-8">
      <Sheet>
        <SheetTrigger asChild>
          <Button size="icon" variant="outline" className="lg:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Abrir menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 border-slate-800 bg-slate-950 p-0 text-slate-100">
          <div className="flex h-16 items-center gap-3 border-b border-slate-800 px-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500 text-white">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-none text-white">Gas Gasparzinho</p>
              <p className="mt-1 text-xs text-emerald-100/75">Gestao de revenda</p>
            </div>
          </div>
          <nav className="space-y-1 p-3">
            {mobileLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white"
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            ))}
            <a
              href="/api/backup"
              download
              className="flex h-10 items-center gap-3 rounded-md bg-emerald-500 px-3 text-sm font-semibold text-white hover:bg-emerald-400"
            >
              <Download className="h-4 w-4" />
              Baixar backup
            </a>
          </nav>
        </SheetContent>
      </Sheet>

      <div className="min-w-0 border-l-4 border-emerald-500 pl-3">
        <p className="text-xs font-semibold uppercase text-emerald-700">Pagina principal</p>
        <h1 className="truncate text-lg font-semibold text-slate-950">Gasparzinho</h1>
      </div>

      <div className="ml-auto hidden w-full max-w-md items-center md:flex">
        <HeaderSearch />
      </div>

      <Button size="icon" variant="outline" className="hidden border-slate-300 bg-white md:inline-flex">
        <Bell className="h-4 w-4" />
        <span className="sr-only">Notificacoes</span>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="rounded-full border-slate-300 bg-white">
            <CircleUser className="h-5 w-5" />
            <span className="sr-only">Abrir conta</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Minha conta</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/dashboard/configuracoes">Configuracoes</Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href="/api/backup" download>Baixar backup</a>
          </DropdownMenuItem>
          <DropdownMenuItem>Suporte</DropdownMenuItem>
          <DropdownMenuSeparator />
          <LogoutButton />
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
