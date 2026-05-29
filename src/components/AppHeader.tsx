import Link from "next/link";
import {
  Bell,
  CircleUser,
  Download,
  Menu,
} from "lucide-react";
import { auth } from "@/auth";
import { LogoutButton } from "@/components/auth/logout-button";
import { BrandLogo } from "@/components/BrandLogo";
import { HeaderSearch } from "@/components/HeaderSearch";
import { Button } from "@/components/ui/button";
import { appNavLinks, roleLabels, settingsNavLink } from "@/lib/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export default async function Header() {
  const session = await auth();
  const userRole = session?.user?.role?.toUpperCase() || "";
  const userName = session?.user?.name || session?.user?.email || "Usuário";
  const roleLabel = roleLabels[userRole] ?? (userRole || "Sem autorização");
  const visibleMobileLinks = appNavLinks.filter((link) =>
    (link.roles as readonly string[]).includes(userRole),
  );
  const canAccessSettings = (settingsNavLink.roles as readonly string[]).includes(userRole);
  const canDownloadBackup = userRole === "ADMIN";

  return (
    <header className="sticky top-0 z-30 flex min-h-16 flex-wrap items-center gap-2 border-b border-slate-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur sm:gap-3 sm:px-4 lg:flex-nowrap lg:pl-6 lg:pr-8">
      <Sheet>
        <SheetTrigger asChild>
          <Button size="icon" variant="outline" className="shrink-0 lg:hidden" aria-label="Abrir menu">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Abrir menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="flex w-[min(20rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)] flex-col overflow-y-auto border-slate-800 bg-slate-950 p-0 text-slate-100"
        >
          <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
          <SheetDescription className="sr-only">Acesse as seções principais do sistema.</SheetDescription>
          <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-4">
            <BrandLogo size={52} />
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-none text-white">Gás Gasparzinho</p>
              <p className="mt-1 text-xs text-emerald-100/75">Gestão de revenda</p>
              <p className="mt-2 truncate text-sm font-semibold text-white">{userName}</p>
              <p className="text-xs font-medium text-emerald-200">{roleLabel}</p>
            </div>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto p-3">
            {visibleMobileLinks.map((link) => (
              <SheetClose key={link.href} asChild>
                <Link
                  href={link.href}
                  className="flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                  <link.icon className="h-4 w-4 shrink-0" />
                  {link.label}
                </Link>
              </SheetClose>
            ))}
            {canDownloadBackup ? (
              <a
                href="/api/backup"
                download
                className="flex min-h-11 items-center gap-3 rounded-md bg-emerald-500 px-3 text-sm font-semibold text-white hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
              >
                <Download className="h-4 w-4" />
                Baixar backup
              </a>
            ) : null}
          </nav>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3 lg:flex-none">
        <BrandLogo size={40} />
        <div className="min-w-0 max-w-[calc(100vw-8.5rem)] border-l-4 border-emerald-500 pl-2 sm:pl-3">
          <p className="truncate text-sm font-bold leading-none text-slate-950">Gás Gasparzinho</p>
          <p className="mt-1 text-xs font-medium text-slate-600">Gestão de revenda</p>
        </div>
        <div className="hidden min-w-0 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 sm:block">
          <p className="truncate text-sm font-semibold leading-none text-slate-950">{userName}</p>
          <p className="mt-1 text-xs font-medium text-emerald-700">{roleLabel}</p>
        </div>
      </div>

      <div className="order-last w-full md:hidden">
        <HeaderSearch />
      </div>

      <div className="ml-auto hidden w-full max-w-md items-center md:flex">
        <HeaderSearch />
      </div>

      <Button size="icon" variant="outline" className="hidden border-slate-300 bg-white md:inline-flex">
        <Bell className="h-4 w-4" />
        <span className="sr-only">Notificações</span>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0 rounded-full border-slate-300 bg-white">
            <CircleUser className="h-5 w-5" />
            <span className="sr-only">Abrir conta</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Minha conta</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {canAccessSettings ? (
            <DropdownMenuItem asChild>
              <Link href="/dashboard/configuracoes">Configurações</Link>
            </DropdownMenuItem>
          ) : null}
          {canDownloadBackup ? (
            <DropdownMenuItem asChild>
              <a href="/api/backup" download>Baixar backup</a>
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem>Suporte</DropdownMenuItem>
          <DropdownMenuSeparator />
          <LogoutButton />
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
