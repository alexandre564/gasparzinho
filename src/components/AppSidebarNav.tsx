'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Download, FileSpreadsheet } from 'lucide-react';

import { mainNavLinks, settingsNavLink } from '@/lib/navigation';

const navigationGroups = [
  {
    title: 'Operação',
    hrefs: ['/dashboard', '/dashboard/clientes', '/dashboard/vendas', '/dashboard/estoque', '/dashboard/entregas', '/dashboard/fidelizacao'],
  },
  {
    title: 'Financeiro',
    hrefs: ['/dashboard/cobranca', '/dashboard/financeiro', '/dashboard/gastos', '/dashboard/fechamento'],
  },
  {
    title: 'Gestão',
    hrefs: ['/dashboard/relatorios', '/dashboard/equipe', '/dashboard/frota'],
  },
  {
    title: 'Plataforma',
    hrefs: ['/dashboard/filiais'],
  },
] as const;

function isActive(pathname: string, href: string) {
  if (href === '/dashboard') {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

type SidebarNavProps = {
  userRole: string;
  canAccessSettings: boolean;
  canDownloadBackup: boolean;
};

export function AppSidebarNav({ userRole, canAccessSettings, canDownloadBackup }: SidebarNavProps) {
  const pathname = usePathname();
  const visibleLinks = mainNavLinks.filter((link) => (link.roles as readonly string[]).includes(userRole));

  return (
    <>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {navigationGroups.map((group) => {
          const groupLinks = visibleLinks.filter((link) => (group.hrefs as readonly string[]).includes(link.href));

          if (groupLinks.length === 0) return null;

          return (
            <div key={group.title} className="space-y-1.5">
              <p className="px-3 text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500">
                {group.title}
              </p>
              {groupLinks.map((link) => {
                const active = isActive(pathname, link.href);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={active ? 'page' : undefined}
                    className={`group flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition duration-150 ease-out motion-safe:hover:translate-x-0.5 ${
                      active
                        ? 'bg-white/10 text-white shadow-inner shadow-white/5 ring-1 ring-white/10'
                        : 'text-slate-300 hover:bg-white/[0.07] hover:text-white'
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-md transition duration-150 ease-out group-hover:scale-105 ${
                        active
                          ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-950/30'
                          : 'bg-slate-900 text-slate-400 group-hover:bg-slate-800 group-hover:text-emerald-200'
                      }`}
                    >
                      <link.icon className="h-4 w-4 shrink-0" />
                    </span>
                    <span className="truncate">{link.label}</span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="space-y-2 border-t border-white/10 p-3">
        {canAccessSettings ? (
          <Link
            href={settingsNavLink.href}
            className={`group flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition duration-150 ease-out motion-safe:hover:translate-x-0.5 ${
              isActive(pathname, settingsNavLink.href)
                ? 'bg-white/10 text-white ring-1 ring-white/10'
                : 'text-slate-300 hover:bg-white/[0.07] hover:text-white'
            }`}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-900 text-slate-400 transition duration-150 ease-out group-hover:scale-105 group-hover:bg-slate-800 group-hover:text-emerald-200">
              <settingsNavLink.icon className="h-4 w-4" />
            </span>
            {settingsNavLink.label}
          </Link>
        ) : null}
        {canDownloadBackup ? (
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-2">
            <p className="mb-2 px-1 text-[11px] font-extrabold uppercase tracking-[0.16em] text-emerald-200">
              Segurança
            </p>
            <a
              href="/api/backup"
              download
              className="interactive-lift flex min-h-10 items-center gap-3 rounded-lg bg-emerald-500 px-3 text-sm font-extrabold text-white shadow-sm hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
            >
              <Download className="h-4 w-4" />
              Backup completo
            </a>
            <a
              href="/api/backup/planilha"
              download
              className="interactive-lift mt-2 flex min-h-10 items-center gap-3 rounded-lg border border-emerald-400/30 px-3 text-sm font-semibold text-emerald-100 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Backup planilha
            </a>
          </div>
        ) : null}
      </div>
    </>
  );
}
