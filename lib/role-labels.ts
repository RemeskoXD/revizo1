/**
 * Jednotné zobrazení rolí v UI (Google Play / interní sjednocení).
 * Interní kódy rolí v DB zůstávají (CUSTOMER, COMPANY_ADMIN, …).
 */

export const ROLE_DISPLAY_NAME: Record<string, string> = {
  ADMIN: 'Admin',
  SUPPORT: 'Admin',
  CONTRACTOR: 'Admin',
  COMPANY_ADMIN: 'Firma',
  TECHNICIAN: 'Technik',
  PRODUCT_MANAGER: 'Produkt Manager (Realitní makléř)',
  REALTY: 'Produkt Manager (Realitní makléř)',
  CUSTOMER: 'Zákazník',
  SVJ: 'Správce SVJ',
  PENDING_SUPPORT: 'Čeká na schválení',
  PENDING_CONTRACTOR: 'Čeká na schválení',
};

/** Krátký štítek vedle loga Revizone v postranním panelu */
export const ROLE_SIDEBAR_BADGE: Record<string, string> = {
  ADMIN: 'Admin',
  SUPPORT: 'Admin',
  CONTRACTOR: 'Admin',
  COMPANY_ADMIN: 'Firma',
  TECHNICIAN: 'Technik',
  PRODUCT_MANAGER: 'Produkt Manager',
  REALTY: 'Produkt Manager',
  CUSTOMER: 'Zákazník',
  SVJ: 'SVJ',
};

export function getRoleDisplayName(role: string | undefined | null): string {
  if (!role) return 'Uživatel';
  return ROLE_DISPLAY_NAME[role] ?? role;
}

export function getRoleSidebarBadge(role: string | undefined | null): string {
  if (!role) return '';
  return ROLE_SIDEBAR_BADGE[role] ?? getRoleDisplayName(role);
}

export function getRevizoneWindowTitle(role: string | undefined | null): string {
  return `Revizone - ${getRoleDisplayName(role)}`;
}

/** Favicon: červené „A“ pro administrátorské rozhraní */
export function isAdminFaviconRole(role: string | undefined | null): boolean {
  return role === 'ADMIN' || role === 'SUPPORT' || role === 'CONTRACTOR';
}
