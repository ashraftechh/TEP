import { Navigate, Outlet, useLocation } from 'react-router';
import { useAppSelector } from '@/store';
import { AppLoadingScreen } from '@/components/routing/AppLoadingScreen';

/**
 * ProtectedRoute — wraps routes that require authentication.
 *
 * Behavior:
 *  • isInitializing → render <AppLoadingScreen /> (never flash content)
 *  • user is null   → redirect to /login (preserves intended destination)
 *  • user exists    → render <Outlet /> (the protected page)
 *
 * Usage in App.tsx:
 *   <Route element={<ProtectedRoute />}>
 *     <Route path="/dashboard" element={<DashboardPage />} />
 *     <Route path="/profile" element={<ProfilePage />} />
 *   </Route>
 */
export function ProtectedRoute() {
  const { user, isInitializing } = useAppSelector((state) => state.auth);
  const location = useLocation();

  if (isInitializing) {
    return <AppLoadingScreen />;
  }

  if (!user) {
    // Preserve the attempted URL so we can redirect back after login
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // An incomplete (SSO) account must finish registration before anything else.
  // This check must precede the email-verification check because SSO-provisioned
  // incomplete users will not have email_verified_at yet.
  if (user.status === 'incomplete') {
    return <Navigate to="/complete-registration" replace />;
  }

  // Pending / unverified users must verify their email before accessing protected pages
  if (user.status === 'pending' || !user.email_verified_at) {
    return <Navigate to="/verify-email" replace />;
  }

  // Application-area boundary: Only student, company_representative, and
  // academic_supervisor may access the frontend client.
  const userRoleNames = user.roles?.map((r) => r.name) ?? [];
  const hasFrontendRole =
    !user.roles ||
    userRoleNames.length === 0 ||
    userRoleNames.some((r) =>
      ['student', 'company_representative', 'academic_supervisor'].includes(r)
    );

  if (!hasFrontendRole) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
