import Link from 'next/link';
import { getRoleSidebarBadge } from '@/lib/role-labels';

type Props = {
  href: string;
  /** Pokud není role, použije se fallbackBadge */
  role?: string | null;
  fallbackBadge?: string;
  /** Admin rozhraní: červený čtverec s „A“ (sjednoceno s faviconem). */
  variant?: 'default' | 'admin';
};

/**
 * Jednotná hlavička postranního panelu: žlutý čtverec R + Revizone + štítek role (nebo červené A u admin).
 */
export function RevizoneSidebarBrand({ href, role, fallbackBadge = 'Revizone', variant = 'default' }: Props) {
  const badge = role ? getRoleSidebarBadge(role) : fallbackBadge;

  return (
    <Link href={href} className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <div
          className={
            variant === 'admin'
              ? 'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-600'
              : 'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-yellow'
          }
        >
          <span className={variant === 'admin' ? 'text-xl font-black text-white' : 'text-xl font-black text-black'}>
            {variant === 'admin' ? 'A' : 'R'}
          </span>
        </div>
        <div className="min-w-0 leading-tight">
          <span className="block text-lg font-bold tracking-tight text-white sm:text-xl">Revizone</span>
          <span className="text-sm font-semibold text-brand-yellow">{badge}</span>
        </div>
      </div>
    </Link>
  );
}
