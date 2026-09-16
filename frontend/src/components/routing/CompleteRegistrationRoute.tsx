import { Navigate, Outlet } from 'react-router';
import { useAppSelector } from '@/store';
import { resolveDashboardPath } from '@/lib/auth';
import { AppLoadingScreen } from '@/components/routing/AppLoadingScreen';

/**
 * CompleteRegistrationRoute — wraps the /complete-registration route.
 *
 * Only users who are authenticated with status === 'incomplete' may access
 * this page. All other visitors are redirected:
 *
 *  • isInitializing           → <AppLoadingScreen />
 *  • !user (unauthenticated)  → /login
 *  • user.status === 'active' → role-appropriate dashboard
 *  • user.status === 'incomplete' → render <Outlet /> (stay on page)
 *
 * Usage in App.tsx:
 *   <Route element={<CompleteRegistrationRoute />}>
 *     <Route path="/complete-registration" element={<CompleteRegistrationPage />} />
 *   </Route>
 */
export function CompleteRegistrationRoute() {
  const { user, isInitializing } = useAppSelector((state) => state.auth);

  if (isInitializing) {
    return <AppLoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.status !== 'incomplete') {
    return <Navigate to={resolveDashboardPath(user)} replace />;
  }

  return <Outlet />;
}

export default CompleteRegistrationRoute;
