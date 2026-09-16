import React from 'react';
import { Link, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '@/hooks/usePermissions';
import { navigationConfig } from '@/config/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppSelector } from '@/store';

interface AppSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onNavigate?: () => void; // called after navigation (close mobile drawer)
  onRefreshActive?: () => void; // called when clicking an already-active link to refresh data
  /** Hide the desktop collapse toggle (e.g. when rendered inside the mobile drawer). */
  hideCollapseToggle?: boolean;
}

/**
 * AppSidebar — primary navigation rail.
 *
 * Profile & Logout have been moved to the User avatar dropdown in AppHeader.
 */
export const AppSidebar: React.FC<AppSidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  onNavigate,
  onRefreshActive,
  hideCollapseToggle = false,
}) => {
  const { i18n } = useTranslation('auth');
  const isRTL = (i18n.language || 'ar') === 'ar';
  const location = useLocation();
  const { can, canAny, hasRole } = usePermissions();

  /**
   * Returns a role-aware label override for certain nav items.
   * Falls back to the item's default label when no override applies.
   */
  const resolveLabel = (key: string, defaultLabel: string): string => {
    if (key === 'training-assignments') {
      if (hasRole('company_representative')) {
        return isRTL ? 'الطلاب المقبولون' : 'Accepted Students';
      }
      if (hasRole('academic_supervisor')) {
        return isRTL ? 'الطلاب' : 'Students';
      }
      // student (default)
      return isRTL ? 'تدريبي' : 'My Training';
    }
    return defaultLabel;
  };

  // Show total application count on the company applications nav item
  const companyApplicationsTotal = useAppSelector(
    (state) => state.application?.companyApplicationsPagination?.total ?? 0
  );

  const visibleItems = navigationConfig.filter((item) => {
    if (item.permission && !can(item.permission)) {
      return false;
    }
    if (item.anyPermissions && item.anyPermissions.length > 0 && !canAny(item.anyPermissions)) {
      return false;
    }
    return true;
  });

  const isActive = (path: string) => location.pathname === path;

  // Resolve badge: for company-applications use live Redux total, else static config badge
  const getBadge = (key: string, staticBadge?: number): number => {
    if (key === 'company-applications') {
      return companyApplicationsTotal;
    }
    return staticBadge ?? 0;
  };

  return (
    <aside
      className={cn(
        'relative flex flex-col h-full bg-surface border-e border-border transition-all duration-300 ease-in-out',
        isCollapsed ? 'w-18' : 'w-64'
      )}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* ── Navigation Items ─────────────────────────────────────────────── */}
      <nav
        className="flex-1 overflow-y-auto pt-6 pb-4 px-3 space-y-1.5"
        aria-label="Main navigation"
      >
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          const label = resolveLabel(item.key, isRTL ? item.labelAr : item.labelEn);
          const badge = getBadge(item.key, item.badge);

          return (
            <Link
              key={item.key}
              to={item.path}
              onClick={(e) => {
                onNavigate?.();
                if (active) {
                  e.preventDefault();
                  onRefreshActive?.();
                }
              }}
              title={isCollapsed ? label : undefined}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer group',
                active
                  ? 'bg-university-primary text-white font-semibold shadow-xs'
                  : 'text-foreground hover:bg-surface-hover transition-colors'
              )}
            >
              <Icon
                className={cn(
                  'shrink-0 transition-colors',
                  'w-5 h-5',
                  active ? 'text-white' : 'text-foreground-muted group-hover:text-foreground'
                )}
              />
              {!isCollapsed && <span className="flex-1 truncate tracking-tight">{label}</span>}
              {!isCollapsed && badge > 0 && (
                <span
                  className={cn(
                    'shrink-0 px-2 py-0.5 text-xs font-bold rounded-full min-w-5 text-center',
                    active ? 'bg-white text-university-primary' : 'bg-destructive text-white'
                  )}
                >
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Collapse Toggle (Desktop only) ──────────────────────────────── */}
      {!hideCollapseToggle && (
        <button
          onClick={onToggleCollapse}
          className={cn(
            'absolute -inset-e-3 top-6 z-10 w-6 h-6 rounded-full bg-surface border border-border shadow-md',
            'flex items-center justify-center text-foreground-muted hover:text-foreground hover:bg-surface-hover',
            'transition-colors cursor-pointer hidden lg:flex'
          )}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isRTL ? (
            isCollapsed ? (
              <ChevronLeft className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )
          ) : isCollapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </button>
      )}
    </aside>
  );
};

export default AppSidebar;
