import { Navigate, Outlet, useLocation } from 'react-router';
import { usePermissions } from '@/hooks/usePermissions';

/**
 * PermissionRoute — wraps routes that require specific permissions from PermissionSeeder.
 *
 * Must be nested inside <ProtectedRoute /> (authentication and frontend-boundary are assumed).
 *
 * Usage:
 *   <Route element={<PermissionRoute permission="companies.own.update" />}>
 *     <Route path="/company/profile" element={<CompanyProfilePage />} />
 *   </Route>
 */
interface PermissionRouteProps {
  /** Single required permission */
  permission?: string;
  /** Pass if the user has ANY of these permissions */
  anyPermissions?: string[];
  /** Pass only if the user has ALL of these permissions */
  allPermissions?: string[];
  /** Where to redirect unauthorized users. Defaults to /dashboard */
  redirectTo?: string;
}

export function PermissionRoute({
  permission,
  anyPermissions,
  allPermissions,
  redirectTo = '/dashboard',
}: PermissionRouteProps) {
  const { can, canAny, canAll } = usePermissions();
  const location = useLocation();

  let hasAccess = true;

  if (permission && !can(permission)) {
    hasAccess = false;
  }

  if (anyPermissions && anyPermissions.length > 0 && !canAny(anyPermissions)) {
    hasAccess = false;
  }

  if (allPermissions && allPermissions.length > 0 && !canAll(allPermissions)) {
    hasAccess = false;
  }

  if (!hasAccess) {
    return <Navigate to={redirectTo} state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
}

export default PermissionRoute;
