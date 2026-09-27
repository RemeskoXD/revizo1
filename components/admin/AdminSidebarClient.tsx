'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  FileText,
  Activity,
  ShieldCheck,
  UserCheck,
  X,
  Mail,
  UserX,
  DollarSign,
  Gift,
  UserPlus,
  Star,
  Settings,
  HelpCircle,
  Package
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';
import { useSidebarWidth } from '@/hooks/useSidebarWidth';
import { RevizoneSidebarBrand } from '@/components/layout/RevizoneSidebarBrand';
import { SidebarFooterBlock } from '@/components/layout/SidebarFooterBlock';
import { SidebarResizeHandle } from '@/components/layout/SidebarResizeHandle';

interface NavItem {
  name: string;
  href: string;
  icon: any;
  roles: string[];
}

interface NavGroup {
  groupName: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    groupName: 'Přehled & Zakázky',
    items: [
      { name: 'Přehled nástěnky', href: '/admin', icon: LayoutDashboard, roles: ['ADMIN', 'SUPPORT', 'CONTRACTOR'] },
      { name: 'Objednávky', href: '/admin/orders', icon: FileText, roles: ['ADMIN', 'SUPPORT', 'CONTRACTOR'] },
      { name: 'Revize – Evidence', href: '/admin/revisions', icon: ShieldCheck, roles: ['ADMIN', 'SUPPORT', 'CONTRACTOR'] },
    ],
  },
  {
    groupName: 'Uživatelé & Schvalování',
    items: [
      { name: 'Uživatelé', href: '/admin/users', icon: Users, roles: ['ADMIN', 'SUPPORT'] },
      { name: 'Nové registrace', href: '/admin/registrations', icon: UserPlus, roles: ['ADMIN', 'SUPPORT'] },
      { name: 'Žádosti o roli', href: '/admin/roles', icon: UserCheck, roles: ['ADMIN', 'SUPPORT'] },
      { name: 'Hodnocení techniků', href: '/admin/ratings', icon: Star, roles: ['ADMIN', 'SUPPORT'] },
      { name: 'Smazání účtů', href: '/admin/account-deletions', icon: UserX, roles: ['ADMIN', 'SUPPORT'] },
    ],
  },
  {
    groupName: 'Finance & Ceníky',
    items: [
      { name: 'Finance', href: '/admin/finances', icon: DollarSign, roles: ['ADMIN'] },
      { name: 'Výplaty', href: '/admin/payouts', icon: DollarSign, roles: ['ADMIN', 'SUPPORT'] },
      { name: 'Ceník produktů', href: '/admin/pricing', icon: DollarSign, roles: ['ADMIN'] },
      { name: 'Balíčky revizí', href: '/admin/packages', icon: Package, roles: ['ADMIN'] },
      { name: 'Ceník položek', href: '/admin/pricing-items', icon: FileText, roles: ['ADMIN'] },
      { name: 'Referral odměny', href: '/admin/referrals', icon: Gift, roles: ['ADMIN', 'SUPPORT'] },
    ],
  },
  {
    groupName: 'Systém & Komunikace',
    items: [
      { name: 'Podpora & Tikety', href: '/admin/support', icon: HelpCircle, roles: ['ADMIN', 'SUPPORT'] },
      { name: 'E-mailové logy', href: '/admin/emails', icon: Mail, roles: ['ADMIN', 'SUPPORT'] },
      { name: 'Audit historie', href: '/admin/history', icon: Activity, roles: ['ADMIN', 'SUPPORT'] },
      { name: 'Nastavení', href: '/admin/settings', icon: Settings, roles: ['ADMIN'] },
    ],
  },
];

interface AdminSidebarClientProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function AdminSidebarClient({ isOpen, onClose }: AdminSidebarClientProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role;
  const { sidebarWidth, isLg, startResize } = useSidebarWidth();

  const isLinkActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname === href || pathname?.startsWith(`${href}/`);
  };

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/80 backdrop-blur-sm transition-opacity duration-300 lg:hidden',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
        aria-hidden
      />

      <div
        className="relative z-50 shrink-0 self-stretch lg:flex lg:h-full lg:min-h-0 lg:flex-col"
        style={isLg ? ({ width: sidebarWidth } as React.CSSProperties) : undefined}
      >
        <div
          className={cn(
            'relative flex h-full min-h-0 w-[min(19rem,88vw)] flex-col border-r border-white/10 bg-[#111] transition-transform duration-300',
            'fixed inset-y-0 left-0 pt-[env(safe-area-inset-top)] lg:relative lg:w-full lg:max-w-none lg:pt-0',
            isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          )}
        >
          <SidebarResizeHandle onMouseDown={startResize} />

          {/* Sidebar Top Brand */}
          <div className="flex min-h-16 shrink-0 items-center justify-between gap-2 border-b border-white/10 px-4 sm:px-6">
            <div className="min-w-0 py-3" onClick={onClose}>
              <RevizoneSidebarBrand href="/admin" role={role} variant="admin" />
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-gray-400 hover:bg-white/10 hover:text-white lg:hidden"
              aria-label="Zavřít menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Grouped Navigation */}
          <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-3 py-5 sm:px-4">
            {navGroups.map((group) => {
              const visibleItems = group.items.filter((item) => role && item.roles.includes(role));
              if (visibleItems.length === 0) return null;

              return (
                <div key={group.groupName} className="space-y-1">
                  <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                    {group.groupName}
                  </p>
                  {visibleItems.map((item) => {
                    const active = isLinkActive(item.href);
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          'group flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all active:scale-[0.98]',
                          active
                            ? 'border-l-2 border-brand-yellow bg-white/10 text-white font-semibold shadow-inner'
                            : 'text-gray-400 hover:bg-white/5 hover:text-white'
                        )}
                      >
                        <Icon
                          className={cn(
                            'h-4 w-4 shrink-0 transition-colors',
                            active ? 'text-brand-yellow' : 'text-gray-400 group-hover:text-white'
                          )}
                        />
                        <span className="truncate">{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Bottom Settings & User Footer */}
          <div className="mt-auto shrink-0 border-t border-white/5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <SidebarFooterBlock settingsHref={role === 'ADMIN' ? '/admin/settings' : '/admin'} />
          </div>
        </div>
      </div>
    </>
  );
}
