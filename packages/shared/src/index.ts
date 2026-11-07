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

export interface HealthResponse {
  status: 'ok' | 'error';
  db: boolean;
  postgis: string | null;
}
