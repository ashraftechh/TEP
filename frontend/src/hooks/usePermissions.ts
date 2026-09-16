import { useAppSelector } from '@/store';
import type { User } from '@/store/slices/authSlice';

/**
 * The 3 roles authorized to access the frontend client application.
 * All other roles (training_coordinator, super_admin) are backend-only.
 */
export const FRONTEND_ROLES = ['student', 'company_representative', 'academic_supervisor'] as const;
export type FrontendRole = (typeof FRONTEND_ROLES)[number];

/**
 * Pure helper to verify if a user has a specific permission.
 */
export function hasPermission(user: User | null | undefined, permission: string): boolean {
  if (!user) return false;
  return Boolean(user.permissions?.includes(permission));
}

/**
 * Pure helper to verify if a user has ANY of the given permissions.
 */
export function hasAnyPermission(user: User | null | undefined, permissions: string[]): boolean {
  if (!user || permissions.length === 0) return false;
  return permissions.some((perm) => user.permissions?.includes(perm));
}

/**
 * Pure helper to verify if a user has ALL of the given permissions.
 */
export function hasAllPermissions(user: User | null | undefined, permissions: string[]): boolean {
  if (!user || permissions.length === 0) return false;
  return permissions.every((perm) => user.permissions?.includes(perm));
}

/**
 * Check if the user belongs to an authorized frontend user type.
 */
export function isFrontendUser(user: User | null | undefined): boolean {
  if (!user) return false;
  const userRoleNames = user.roles?.map((r) => r.name) ?? [];
  return userRoleNames.some((r) => FRONTEND_ROLES.includes(r as FrontendRole));
}

/**
 * React hook for permission and role boundary evaluation.
 */
export function usePermissions() {
  const { user } = useAppSelector((state) => state.auth);
  const userRoleNames = user?.roles?.map((r) => r.name) ?? [];

  return {
    user,
    roles: userRoleNames,
    permissions: user?.permissions ?? [],
    hasRole: (role: string) => userRoleNames.includes(role),
    hasPermission: (permission: string) => hasPermission(user, permission),
    can: (permission: string) => hasPermission(user, permission),
    canAny: (permissions: string[]) => hasAnyPermission(user, permissions),
    canAll: (permissions: string[]) => hasAllPermissions(user, permissions),
    isFrontendUser: isFrontendUser(user),
  };
}

export default usePermissions;
