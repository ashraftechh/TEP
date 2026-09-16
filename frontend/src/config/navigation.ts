import {
  BarChart3,
  User as UserIcon,
  Briefcase,
  ClipboardList,
  ClipboardCheck,
  Building2,
  FileText,
  MessageSquare,
  Users,
  GraduationCap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavigationItem {
  /** Unique key used for aria and active-state comparison */
  key: string;
  labelAr: string;
  labelEn: string;
  icon: LucideIcon;
  /** Exact path this item links to */
  path: string;
  /** Optional notification count badge */
  badge?: number;
  /**
   * Optional single required permission from PermissionSeeder.
   */
  permission?: string;
  /**
   * Optional list of permissions; item is visible if user has ANY of them.
   */
  anyPermissions?: string[];
}

/**
 * Centralized, permission-aware navigation configuration.
 * Adheres to PermissionSeeder as the source of truth.
 */
export const navigationConfig: NavigationItem[] = [
  {
    key: 'dashboard',
    labelAr: 'نظرة عامة',
    labelEn: 'Overview',
    icon: BarChart3,
    path: '/dashboard',
    anyPermissions: [
      'student_profiles.own.view',
      'company_representatives.own.view',
      'academic_supervisor_profiles.own.view',
      'sso_identities.own.view',
    ],
  },
  {
    key: 'profile',
    labelAr: 'الملف الشخصي',
    labelEn: 'Profile',
    icon: UserIcon,
    path: '/profile',
    anyPermissions: [
      'student_profiles.own.view',
      'company_representatives.own.view',
      'academic_supervisor_profiles.own.view',
    ],
  },
  {
    key: 'company-profile',
    labelAr: 'ملف الشركة',
    labelEn: 'Company Profile',
    icon: Building2,
    path: '/company/profile',
    permission: 'companies.own.update',
  },
  {
    key: 'company-team',
    labelAr: 'فريق الشركة',
    labelEn: 'Company Team',
    icon: Users,
    path: '/company/team',
    permission: 'company_representatives.own.view',
  },
  {
    key: 'opportunities',
    labelAr: 'فرص التدريب',
    labelEn: 'Training Opportunities',
    icon: Briefcase,
    path: '/opportunities',
    permission: 'opportunities.view_any',
  },
  {
    key: 'my-applications',
    labelAr: 'طلباتي',
    labelEn: 'My Applications',
    icon: ClipboardList,
    // TEP-636/637: student-facing own applications list
    path: '/my-applications',
    permission: 'applications.own.view',
  },
  {
    key: 'company-applications',
    labelAr: 'إدارة الطلبات',
    labelEn: 'Applications Management',
    icon: ClipboardCheck,
    // TEP-644/645: company-representative-facing review list
    path: '/company/applications',
    permission: 'applications.company.view',
  },
  {
    key: 'training-assignments',
    labelAr: 'التكليفات التدريبية',
    labelEn: 'Training Assignments',
    icon: GraduationCap,
    // TEP-666: role-aware view (student own / supervisor list / company list)
    path: '/training-assignments',
    permission: 'training_assignments.own.view',
  },
  {
    key: 'reports',
    labelAr: 'التقارير',
    labelEn: 'Reports',
    icon: FileText,
    path: '/reports',
    anyPermissions: ['reports.own.view', 'reports.review'],
  },
  {
    key: 'messages',
    labelAr: 'الرسائل',
    labelEn: 'Messages',
    icon: MessageSquare,
    path: '/messages',
    permission: 'messages.own.view',
    badge: 2,
  },
];
