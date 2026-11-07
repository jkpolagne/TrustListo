import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ROLE_HOME, type Role } from '@trustlisto/shared';
import { useMe } from '../lib/auth';

/**
 * Gate for signed-in pages. Signed out → sign-in page. Wrong role → that user's own dashboard.
 * The API enforces the same rules; this only keeps people out of screens they can't use.
 */
export function RequireRole({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const me = useMe();
  const location = useLocation();

  if (me.isPending) return null;
  if (!me.data) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  if (roles && !roles.includes(me.data.role)) {
    return <Navigate to={ROLE_HOME[me.data.role]} replace />;
  }
  return <>{children}</>;
}
