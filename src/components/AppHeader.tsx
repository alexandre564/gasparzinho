import Link from 'next/link';
import { Bell, Building2, CircleUser, Menu } from 'lucide-react';

import { auth } from '@/auth';
import { LogoutButton } from '@/components/auth/logout-button';
import { AppSidebarNav } from '@/components/AppSidebarNav';
import { BrandLogo } from '@/components/BrandLogo';
import { BranchScopeSelector } from '@/components/BranchScopeSelector';
import { HeaderSearch } from '@/components/HeaderSearch';
import { Button } from '@/components/ui/button';
import { getDefaultBranchName } from '@/lib/branch-settings';
import { getCurrentBranchDisplayName } from '@/lib/current-branch-scope';
import { roleLabels, settingsNavLink } from '@/lib/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

export default async function Header() {
  const [session, defaultBranchName] = await Promise.all([auth(), getDefaultBranchName()]);
  const branchName = await getCurrentBranchDisplayName(defaultBranchName);
  const userRole = session?.user?.role?.toUpperCase() || '';
  const userName = session?.user?.name || session?.user?.email || 'Usuário';
  const roleLabel = roleLabels[userRole] ?? (userRole || 'Sem autorização');
  const canAccessSettings = (settingsNavLink.roles as readonly string[]).includes(userRole);
  const canDownloadBackup = userRole === 'ADMIN';

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
      <div className="flex min-h-[4.75rem] flex-wrap items-center gap-3 px-3 py-3 sm:px-4 lg:flex-nowrap lg:px-8">
        <Sheet>
          <SheetTrigger asChild>
            <Button size="icon" variant="outline" className="shrink-0 rounded-lg border-slate-300 bg-white lg:hidden" aria-label="Abrir menu">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Abrir menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="flex w-[min(21rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)] flex-col overflow-y-auto border-slate-800 bg-[#07111f] p-0 text-slate-100"
          >
            <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
            <SheetDescription className="sr-only">Acesse as seções principais do sistema.</SheetDescription>
            <div className="border-b border-white/10 px-4 py-4">
              <div className="flex items-center gap-3">
                <BrandLogo size={52} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold leading-none text-white">{branchName}</p>
                  <p className="mt-1 text-xs font-medium text-emerald-100/70">Gestão de revenda</p>
                </div>
              </div>
              <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.045] p-3">
                <p className="truncate text-sm font-bold text-white">{userName}</p>
                <p className="mt-1 text-xs font-extrabold text-emerald-200">{roleLabel}</p>
              </div>
            </div>
            <AppSidebarNav
              userRole={userRole}
              canAccessSettings={canAccessSettings}
              canDownloadBackup={canDownloadBackup}
            />
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 items-center gap-3">
          <BrandLogo size={42} />
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-emerald-700">Contexto atual</p>
            <p className="truncate text-sm font-black leading-tight text-slate-950 sm:text-base">{branchName}</p>
            <p className="mt-0.5 text-xs font-medium text-slate-600">Gestão de revenda</p>
          </div>
        </div>

        <div className="hidden min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm md:flex">
          <Building2 className="h-4 w-4 text-emerald-700" />
          <div className="min-w-0">
            <p className="truncate text-xs font-bold leading-none text-slate-950">{userName}</p>
            <p className="mt-1 text-[11px] font-extrabold uppercase tracking-wide text-emerald-700">{roleLabel}</p>
          </div>
        </div>

        <div className="order-last w-full md:hidden">
          <HeaderSearch />
        </div>

        <div className="ml-auto hidden w-full max-w-xl items-center md:flex">
          <HeaderSearch />
        </div>

        <BranchScopeSelector />

        <Button size="icon" variant="outline" className="hidden rounded-lg border-slate-300 bg-white shadow-sm md:inline-flex" aria-label="Notificações">
          <Bell className="h-4 w-4" />
          <span className="sr-only">Notificações</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="shrink-0 rounded-full border-slate-300 bg-white shadow-sm">
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
            {canDownloadBackup ? (
              <DropdownMenuItem asChild>
                <a href="/api/backup/planilha" download>Backup em planilha</a>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem>Suporte</DropdownMenuItem>
            <DropdownMenuSeparator />
            <LogoutButton />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
