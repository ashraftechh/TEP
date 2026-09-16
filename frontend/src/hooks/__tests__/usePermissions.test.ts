import { describe, it, expect } from 'vitest';
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  isFrontendUser,
} from '../usePermissions';
import type { User } from '@/store/slices/authSlice';

describe('usePermissions utility functions', () => {
  const mockStudentUser: User = {
    id: 1,
    name: 'Student User',
    email: 'student@univ.edu',
    status: 'active',
    roles: [{ id: 1, name: 'student', label: { ar: 'طالب', en: 'Student' } }],
    permissions: ['student_profiles.own.view', 'applications.own.create', 'opportunities.view_any'],
  };

  const mockRepUser: User = {
    id: 2,
    name: 'Company Rep',
    email: 'rep@company.com',
    status: 'active',
    roles: [
      { id: 2, name: 'company_representative', label: { ar: 'ممثل شركة', en: 'Company Rep' } },
    ],
    permissions: [
      'opportunities.own.create',
      'opportunities.own.update',
      'companies.own.update',
      'opportunities.view_any',
    ],
  };

  const mockAdminUser: User = {
    id: 3,
    name: 'Super Admin',
    email: 'admin@univ.edu',
    status: 'active',
    roles: [{ id: 5, name: 'super_admin', label: { ar: 'مدير النظام', en: 'Super Admin' } }],
    permissions: ['roles.view_any', 'users.create', 'settings.manage_sso'],
  };

  it('hasPermission evaluates exact permission strings accurately', () => {
    expect(hasPermission(mockStudentUser, 'applications.own.create')).toBe(true);
    expect(hasPermission(mockStudentUser, 'opportunities.own.create')).toBe(false);
    expect(hasPermission(mockRepUser, 'opportunities.own.create')).toBe(true);
    expect(hasPermission(null, 'opportunities.own.create')).toBe(false);
  });

  it('hasAnyPermission checks if at least one permission matches', () => {
    expect(
      hasAnyPermission(mockStudentUser, ['opportunities.own.create', 'opportunities.view_any'])
    ).toBe(true);
    expect(hasAnyPermission(mockStudentUser, ['companies.approve', 'roles.view_any'])).toBe(false);
    expect(hasAnyPermission(null, ['opportunities.view_any'])).toBe(false);
  });

  it('hasAllPermissions checks if all permissions are held', () => {
    expect(
      hasAllPermissions(mockRepUser, ['opportunities.own.create', 'companies.own.update'])
    ).toBe(true);
    expect(hasAllPermissions(mockRepUser, ['opportunities.own.create', 'companies.approve'])).toBe(
      false
    );
  });

  it('isFrontendUser correctly recognizes frontend vs backend roles', () => {
    expect(isFrontendUser(mockStudentUser)).toBe(true);
    expect(isFrontendUser(mockRepUser)).toBe(true);
    expect(isFrontendUser(mockAdminUser)).toBe(false);
    expect(isFrontendUser(null)).toBe(false);
  });
});
