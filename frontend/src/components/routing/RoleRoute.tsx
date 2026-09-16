import { Navigate, Outlet, useLocation } from 'react-router';
import { useAppSelector } from '@/store';

/**
 * RoleRoute — wraps routes that are only accessible to specific roles.
 *
 * Must be nested inside <ProtectedRoute /> (authentication is assumed).
 *
 * Behavior:
 *  • user has one of the allowed roles → render <Outlet />
 *  • user lacks the required role      → redirect to /dashboard
 *
 * Usage in App.tsx:
 *   <Route element={<RoleRoute roles={['company_representative']} />}>
 *     <Route path="/company/team" element={<CompanyTeamPage />} />
 *   </Route>
 */

interface RoleRouteProps {
  /** Role names (matching user.roles[].name) that may access this route. */
  roles: string[];
  /** Where to redirect unauthorized users. Defaults to /dashboard. */
  redirectTo?: string;
}

export function RoleRoute({ roles, redirectTo = '/dashboard' }: RoleRouteProps) {
  const { user } = useAppSelector((state) => state.auth);
  const location = useLocation();

  const userRoles: string[] = user?.roles?.map((r) => r.name) ?? [];
  const hasRole = userRoles.some((r) => roles.includes(r));

  if (!hasRole) {
    return <Navigate to={redirectTo} state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
}

export default RoleRoute;
