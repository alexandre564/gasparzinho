import { auth } from '@/auth';
import { AppSidebarNav } from '@/components/AppSidebarNav';
import { BrandLogo } from '@/components/BrandLogo';
import { getDefaultBranchName } from '@/lib/branch-settings';
import { getCurrentBranchDisplayName } from '@/lib/current-branch-scope';
import { roleLabels, settingsNavLink } from '@/lib/navigation';

export default async function Sidebar() {
  const [session, defaultBranchName] = await Promise.all([auth(), getDefaultBranchName()]);
  const branchName = await getCurrentBranchDisplayName(defaultBranchName);
  const userRole = session?.user?.role?.toUpperCase() || '';
  const userName = session?.user?.name || session?.user?.email || 'Usuário';
  const roleLabel = roleLabels[userRole] ?? (userRole || 'Sem autorização');
  const canAccessSettings = (settingsNavLink.roles as readonly string[]).includes(userRole);
  const canDownloadBackup = userRole === 'ADMIN';

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 border-r border-slate-800 bg-[#07111f] text-slate-100 shadow-2xl lg:flex lg:flex-col">
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-3">
          <BrandLogo size={58} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold leading-none text-white">{branchName}</p>
            <p className="mt-1 text-xs font-medium text-emerald-100/70">Gestão de revenda</p>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.045] p-3 shadow-inner shadow-black/20">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500">Operador</p>
          <p className="mt-2 truncate text-sm font-bold text-white">{userName}</p>
          <p className="mt-1 inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-xs font-extrabold text-emerald-200">
            {roleLabel}
          </p>
        </div>
      </div>

      <AppSidebarNav
        userRole={userRole}
        canAccessSettings={canAccessSettings}
        canDownloadBackup={canDownloadBackup}
      />
    </aside>
  );
}
