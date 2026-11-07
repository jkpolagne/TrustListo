import type { Prisma } from '@prisma/client';
import type { AuthUser } from '../middleware/auth';
import { forbiddenError } from '../middleware/errorHandler';

/**
 * Tenant scope (SPEC §5.3). firmId always comes from the session, never from the request.
 * SuperAdmin has no firm and is refused here: it never sees firm internals (rule 5).
 */
export function firmScope(user: AuthUser): { firmId: string } {
  if (!user.firmId) throw forbiddenError();
  return { firmId: user.firmId };
}

/** Which users (consultants/staff) this user may see. */
export function userScope(user: AuthUser): Prisma.UserWhereInput {
  const { firmId } = firmScope(user);
  switch (user.role) {
    case 'COMPANY_ADMIN':
    case 'BROKER':
      return { firmId };
    case 'SALES_MANAGER':
      return { firmId, OR: [{ id: user.id }, { managerId: user.id }] };
    default:
      throw forbiddenError();
  }
}
