'use client';

import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { getRevizoneWindowTitle, isAdminFaviconRole } from '@/lib/role-labels';

const FAVICON_ADMIN = '/favicon-admin.svg';
const FAVICON_APP = '/favicon-app.svg';

/**
 * Nastaví titulek záložky (Revizone - role) a dynamickou ikonu (Admin = červené A, jinak žluté R).
 */
export function RevizoneRoleChrome() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'loading') return;

    if (!session?.user) {
      document.title = 'Revizone';
    } else {
      document.title = getRevizoneWindowTitle(session.user.role);
    }

    const role = session?.user?.role;
    const href = isAdminFaviconRole(role) ? FAVICON_ADMIN : FAVICON_APP;
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.type = 'image/svg+xml';
    link.href = `${href}?v=1`;
  }, [session?.user?.role, status]);

  return null;
}
