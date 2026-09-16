import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { fetchCurrentUser } from '@/store/slices/authSlice';
import { AppLoadingScreen } from '@/components/routing/AppLoadingScreen';

/**
 * AuthInitializer — mounts once at the top of the component tree (inside
 * BrowserRouter but wrapping all routes).
 *
 * Responsibilities:
 *  1. Dispatches GET /api/v1/auth/me once on startup to rehydrate the Redux
 *     auth state from the server-side Sanctum session cookie.
 *  2. Renders a full-screen loading screen while the check is in flight
 *     (isInitializing === true).
 *  3. Once resolved (fulfilled OR rejected), isInitializing becomes false and
 *     children are rendered — at which point ProtectedRoute / GuestRoute can
 *     make authoritative redirect decisions with no flash.
 *
 * This is the ONLY place the startup session check runs.
 */
export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const isInitializing = useAppSelector((state) => state.auth.isInitializing);

  useEffect(() => {
    dispatch(fetchCurrentUser());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — runs exactly once on app mount

  if (isInitializing) {
    return <AppLoadingScreen />;
  }

  return <>{children}</>;
}

export default AuthInitializer;
