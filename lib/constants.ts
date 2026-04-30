export const ROLES = {
  CUSTOMER: 'CUSTOMER',
  TECHNICIAN: 'TECHNICIAN',
  COMPANY_ADMIN: 'COMPANY_ADMIN',
  REALTY: 'REALTY',
  SVJ: 'SVJ',
  ADMIN: 'ADMIN',
  SUPPORT: 'SUPPORT',
  CONTRACTOR: 'CONTRACTOR',
  PENDING_SUPPORT: 'PENDING_SUPPORT',
  PENDING_CONTRACTOR: 'PENDING_CONTRACTOR',
  PRODUCT_MANAGER: 'PRODUCT_MANAGER',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ORDER_STATUS = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  NEEDS_REVISION: 'NEEDS_REVISION',
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export const REVISION_RESULT = {
  PASS: 'PASS',
  PASS_WITH_NOTES: 'PASS_WITH_NOTES',
  FAIL: 'FAIL',
} as const;

export const ROLE_LABELS: Record<string, string> = {
  CUSTOMER: 'Zákazník',
  TECHNICIAN: 'Technik',
  COMPANY_ADMIN: 'Firma',
  REALTY: 'Produkt Manager (Realitní makléř)',
  SVJ: 'Správce SVJ',
  ADMIN: 'Admin',
  SUPPORT: 'Admin',
  CONTRACTOR: 'Admin',
  PENDING_SUPPORT: 'Čeká na schválení (Support)',
  PENDING_CONTRACTOR: 'Čeká na schválení (Dodavatel)',
  PRODUCT_MANAGER: 'Produkt Manager (Realitní makléř)',
};

export const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Čeká',
  IN_PROGRESS: 'Probíhá',
  COMPLETED: 'Dokončeno',
  CANCELLED: 'Zrušeno',
  NEEDS_REVISION: 'K přepracování',
};

export const ROUTE_ACCESS: Record<string, string[]> = {
  '/admin': [ROLES.ADMIN, ROLES.SUPPORT, ROLES.CONTRACTOR],
  '/company': [ROLES.COMPANY_ADMIN],
  '/technician': [ROLES.TECHNICIAN],
  '/realty': [ROLES.REALTY],
  '/svj': [ROLES.SVJ],
  '/dashboard': [ROLES.CUSTOMER, ROLES.REALTY, ROLES.SVJ, ROLES.TECHNICIAN, ROLES.COMPANY_ADMIN, ROLES.ADMIN, ROLES.SUPPORT, ROLES.CONTRACTOR],
};
