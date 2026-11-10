import type { AuthUser } from '../../middleware/auth';
import { prisma } from '../../lib/prisma';
import { firmScope } from '../../lib/scope';

/**
 * Whose leads and visits a user may see (SPEC §5.2, §10.8):
 * CompanyAdmin and Broker: the whole firm. Sales Manager: their own plus their team's.
 * Sales Person: their own. Returned as a filter on `consultantId`.
 */
export async function consultantScope(
  user: AuthUser,
): Promise<{ firmId: string; consultantId?: { in: string[] } }> {
  const { firmId } = firmScope(user);
  if (user.role === 'COMPANY_ADMIN' || user.role === 'BROKER') return { firmId };
  if (user.role === 'SALES_MANAGER') {
    const team = await prisma.user.findMany({
      where: { firmId, managerId: user.id },
      select: { id: true },
    });
    return { firmId, consultantId: { in: [user.id, ...team.map((t) => t.id)] } };
  }
  return { firmId, consultantId: { in: [user.id] } };
}

export const isConsultant = (role: string) => role === 'SALES_MANAGER' || role === 'SALES_PERSON';
