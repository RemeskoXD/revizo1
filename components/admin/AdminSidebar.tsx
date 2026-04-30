import Link from 'next/link';
import { LayoutDashboard, Users, FileText, Settings, ShieldAlert, Activity, ShieldCheck, UserCheck, Mail, ClipboardCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { LogoutButton } from '@/components/LogoutButton';

export async function AdminSidebar() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;

  const navigation = [
    { name: 'Přehled', href: '/admin', icon: LayoutDashboard, roles: ['ADMIN', 'SUPPORT', 'CONTRACTOR'] },
    { name: 'Objednávky', href: '/admin/orders', icon: FileText, roles: ['ADMIN', 'SUPPORT', 'CONTRACTOR'] },
    { name: 'Uživatelé', href: '/admin/users', icon: Users, roles: ['ADMIN', 'SUPPORT'] },
    { name: 'Registrace (oprávnění)', href: '/admin/registrations', icon: ClipboardCheck, roles: ['ADMIN', 'SUPPORT'] },
    { name: 'Žádosti o role', href: '/admin/roles', icon: UserCheck, roles: ['ADMIN', 'SUPPORT'] },
    { name: 'Revize – Data', href: '/admin/revisions', icon: ShieldCheck, roles: ['ADMIN', 'SUPPORT', 'CONTRACTOR'] },
    { name: 'E-maily', href: '/admin/emails', icon: Mail, roles: ['ADMIN', 'SUPPORT'] },
    { name: 'Historie', href: '/admin/history', icon: Activity, roles: ['ADMIN', 'SUPPORT'] },
    { name: 'Nastavení', href: '/admin/settings', icon: Settings, roles: ['ADMIN'] },
  ];

  const filteredNavigation = navigation.filter(item => role && item.roles.includes(role));

  return (
    <div className="flex h-full w-64 flex-col bg-[#111] border-r border-white/10">
      <div className="flex h-16 items-center px-6 border-b border-white/10">
        <Link href="/admin" className="flex items-center gap-2">
           <div className="relative flex items-center justify-center w-8 h-8 bg-red-600 rounded-md">
              <ShieldAlert className="w-5 h-5 text-white" />
           </div>
           <span className="text-xl font-bold text-white tracking-tight">REVIZONE APLIKACE</span>
        </Link>
      </div>

      <div className="flex-1 flex flex-col gap-1 px-3 py-6">
        <div className="space-y-1">
            <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Správa</p>
            {filteredNavigation.map((item) => (
            <Link
                key={item.name}
                href={item.href}
                className={cn(
                "group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors",
                "text-gray-400 hover:text-white hover:bg-white/5"
                )}
            >
                <item.icon className="w-5 h-5 group-hover:text-red-500 transition-colors" />
                {item.name}
            </Link>
            ))}
        </div>
      </div>

      <div className="p-4 border-t border-white/10">
        <LogoutButton />
      </div>
    </div>
  );
}
