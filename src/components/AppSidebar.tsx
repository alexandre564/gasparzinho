import Link from 'next/link';
import { Download } from 'lucide-react';
import { auth } from '@/auth';
import { BrandLogo } from '@/components/BrandLogo';
import { mainNavLinks, roleLabels, settingsNavLink } from '@/lib/navigation';

export default async function Sidebar() {
  const session = await auth();
  const userRole = session?.user?.role?.toUpperCase() || '';
  const userName = session?.user?.name || session?.user?.email || 'Usuário';
  const roleLabel = roleLabels[userRole] ?? (userRole || 'Sem autorização');
  const filteredNavLinks = mainNavLinks.filter((link) =>
    (link.roles as readonly string[]).includes(userRole),
  );
  const canAccessSettings = (settingsNavLink.roles as readonly string[]).includes(userRole);

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-slate-800 bg-slate-950 text-slate-100 shadow-2xl lg:flex lg:flex-col">
      <div className="border-b border-slate-800 px-5 py-5">
        <div className="flex items-center gap-3">
          <BrandLogo size={56} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-none text-white">Gás Gasparzinho</p>
            <p className="mt-1 text-xs text-emerald-100/75">Gestão de revenda</p>
            <div className="mt-3 rounded-md border border-white/10 bg-white/5 px-3 py-2">
              <p className="truncate text-sm font-semibold text-white">{userName}</p>
              <p className="mt-0.5 text-xs font-medium text-emerald-200">{roleLabel}</p>
            </div>
          </div>
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
        {canAccessSettings ? (
          <Link
            href={settingsNavLink.href}
            className="group flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900 text-slate-400 group-hover:bg-emerald-500 group-hover:text-white">
              <settingsNavLink.icon className="h-4 w-4" />
            </span>
            {settingsNavLink.label}
          </Link>
        ) : null}
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
