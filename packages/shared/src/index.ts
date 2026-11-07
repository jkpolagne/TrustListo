// Shared between web and api. Keep in sync with the Prisma enums in apps/api/prisma/schema.prisma.

export const ROLES = [
  'SUPER_ADMIN',
  'COMPANY_ADMIN',
  'BROKER',
  'SALES_MANAGER',
  'SALES_PERSON',
] as const;
export type Role = (typeof ROLES)[number];

/** Dashboard each role lands on after login. */
export const ROLE_HOME: Record<Role, string> = {
  SUPER_ADMIN: '/superadmin',
  COMPANY_ADMIN: '/admin',
  BROKER: '/broker',
  SALES_MANAGER: '/manager',
  SALES_PERSON: '/salesperson',
};

const php = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

/** Formats a peso amount, e.g. 1500000 → "₱1,500,000.00". Accepts Prisma Decimal strings. */
export function formatPeso(amount: number | string): string {
  return php.format(typeof amount === 'string' ? Number(amount) : amount);
}

export const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: 'Platform admin',
  COMPANY_ADMIN: 'Company admin',
  BROKER: 'Broker',
  SALES_MANAGER: 'Sales manager',
  SALES_PERSON: 'Salesperson',
};

/** The signed-in user, as returned by GET /api/v1/auth/me. */
export interface Me {
  id: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
  referralCode: string | null;
  firm: { id: string; name: string; slug: string } | null;
  credentials: {
    id: string;
    type: 'PRC_LICENSE' | 'DHSUD_REGISTRATION';
    status: 'PENDING_AI' | 'NEEDS_ATTENTION' | 'READY_FOR_REVIEW' | 'APPROVED' | 'REJECTED';
    expiresAt: string | null;
  }[];
}

/** Error body for every non-2xx API response (SPEC §13). */
export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}

export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}

export const CSRF_COOKIE = 'tl_csrf';
export const CSRF_HEADER = 'x-csrf-token';

export interface HealthResponse {
  status: 'ok' | 'error';
  db: boolean;
  postgis: string | null;
}
