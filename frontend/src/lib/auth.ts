import type { User } from '@/store/slices/authSlice';

/**
 * Resolves the appropriate frontend destination route for an authenticated user
 * based on their account status and server-resolved role(s).
 *
 * NOTE: Role-specific dashboards (/student/dashboard etc.) are reserved for
 * future implementation. All authenticated users currently land on /dashboard.
 * A catch-all route in App.tsx redirects any unknown authenticated path back
 * to /dashboard to prevent 404s.
 */
export const resolveDashboardPath = (user: User | null): string => {
  if (!user) {
    return '/login';
  }

  // Pending email verification users must verify email before accessing dashboard
  if (user.status === 'pending' || !user.email_verified_at) {
    return '/verify-email';
  }

  // JIT-provisioned SSO users who haven't completed their registration
  if (user.status === 'incomplete') {
    return '/complete-registration';
  }

  // All authenticated & active users → unified dashboard
  return '/dashboard';
};
