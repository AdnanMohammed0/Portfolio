import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Spinner } from '@/components/primitives';

/**
 * Route guard for /admin.
 *
 * `isAdmin` is resolved by querying the RLS-protected `admin_users` table, so
 * this is a UX gate on top of database-enforced authorisation — not the only
 * thing standing between a visitor and the content. Even if someone bypassed
 * this component, every write is rejected by row-level security.
 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { ready, user, isAdmin, configured } = useAuth();
  const location = useLocation();

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label="Checking access" />
      </div>
    );
  }

  // Without Supabase there is no auth system at all; the dashboard runs open
  // against the local demo store so the UI can be developed.
  if (!configured) return <>{children}</>;

  if (!user || !isAdmin) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
