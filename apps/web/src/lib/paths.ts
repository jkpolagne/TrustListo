import type { Role } from '@trustlisto/shared';

/** URL prefix of each role's office area (/admin, /broker, /manager, /salesperson). */
const BASE: Record<Role, string> = {
  SUPER_ADMIN: '/superadmin',
  COMPANY_ADMIN: '/admin',
  BROKER: '/broker',
  SALES_MANAGER: '/manager',
  SALES_PERSON: '/salesperson',
};

export const basePath = (role: Role) => BASE[role];
export const isConsultantRole = (role: Role) => role === 'SALES_MANAGER' || role === 'SALES_PERSON';

/** Public listing link that credits a consultant (SPEC §10.7). */
export const referralLink = (slug: string, code: string) =>
  `${window.location.origin}/properties/${slug}?ref=${code}`;
