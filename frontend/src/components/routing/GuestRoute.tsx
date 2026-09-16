import { Navigate, Outlet } from 'react-router';
import { useAppSelector } from '@/store';
import { resolveDashboardPath } from '@/lib/auth';
import { AppLoadingScreen } from '@/components/routing/AppLoadingScreen';

/**
 * GuestRoute — wraps routes that should only be accessible to guests
 * (unauthenticated users).
 *
 * Behavior:
 *  • isInitializing → render <AppLoadingScreen /> (never flash content)
 *  • user exists    → redirect to the user's role-appropriate dashboard
 *  • user is null   → render <Outlet /> (the guest/auth page)
 *
 * Routes: /, /login, /register
 *
 * Note: /forgot-password and /reset-password are kept public (accessible to
 * both guests and authenticated users) because there is no UX benefit to
 * blocking authenticated users from them.
 *
 * Usage in App.tsx:
 *   <Route element={<GuestRoute />}>
 *     <Route path="/login" element={<LoginPage />} />
 *     <Route path="/register" element={<RegisterPage />} />
 *   </Route>
 */
export function GuestRoute() {
  const { user, isInitializing } = useAppSelector((state) => state.auth);

  if (isInitializing) {
    return <AppLoadingScreen />;
  }

  if (user) {
    const userRoleNames = user.roles?.map((r) => r.name) ?? [];
    const hasFrontendRole =
      !user.roles ||
      userRoleNames.length === 0 ||
      userRoleNames.some((r) =>
        ['student', 'company_representative', 'academic_supervisor'].includes(r)
      );

    if (hasFrontendRole) {
      return <Navigate to={resolveDashboardPath(user)} replace />;
    }
  }

  return <Outlet />;
}

export default GuestRoute;
