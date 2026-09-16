import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ApplicationTransitionItem } from '@/types/application';
import {
  FileText,
  Eye,
  CalendarClock,
  CheckCircle2,
  XCircle,
  Undo2,
  Loader2,
  AlertCircle,
  type LucideIcon,
} from 'lucide-react';

// ── Status → icon/color mapping ────────────────────────────────────────────
// Mirrors the badge color language already established in MyApplicationsPage
// / CompanyApplicationsPage (yellow=submitted, blue=under_review,
// purple=interview_scheduled, green=accepted, red=rejected, grey=withdrawn),
// applied here to the timeline dot instead of a badge.
const STATUS_DOT_CONFIG: Record<string, { icon: LucideIcon; className: string }> = {
  submitted: {
    icon: FileText,
    className:
      'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800',
  },
  under_review: {
    icon: Eye,
    className:
      'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
  },
  interview_scheduled: {
    icon: CalendarClock,
    className:
      'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
  },
  accepted: {
    icon: CheckCircle2,
    className:
      'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
  },
  rejected: {
    icon: XCircle,
    className:
      'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
  },
  withdrawn: {
    icon: Undo2,
    className:
      'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
  },
};

const DEFAULT_DOT_CONFIG = { icon: FileText, className: STATUS_DOT_CONFIG.submitted.className };

// Role → short display label. Falls back to the raw role name (title-cased)
// for any role not in this map, so an unexpected role never disappears.
const ROLE_LABEL_KEYS: Record<string, string> = {
  student: 'history.roles.student',
  company_representative: 'history.roles.company_representative',
  training_coordinator: 'history.roles.training_coordinator',
  super_admin: 'history.roles.super_admin',
};

interface ApplicationTimelineProps {
  transitions: ApplicationTransitionItem[];
  isLoading?: boolean;
  error?: string | null;
  language: string;
}

/**
 * TEP-658 — Application History / Timeline.
 *
 * A vertical stepper built from plain divs + Tailwind (shadcn/ui has no
 * built-in stepper primitive) rather than a Card-per-event list, per the
 * ticket's own suggestion. Shown on both the student's application detail
 * view (ApplicationHistoryPage, TEP-637's "View History" stub) and the
 * company's review detail view (ViewApplicationDialog in
 * CompanyApplicationsPage, TEP-645).
 *
 * Consumes the ApplicationTransitionItem[] returned by
 * GET /api/v1/applications/{application}/transitions (TEP-657) — each entry
 * carries from_status → to_status, actor name + role(s), a timestamp, and an
 * optional reason (rejection/withdrawal reason).
 */
export const ApplicationTimeline: React.FC<ApplicationTimelineProps> = ({
  transitions,
  isLoading = false,
  error = null,
  language,
}) => {
  const { t } = useTranslation(['applications', 'common']);
  const isRTL = language === 'ar';

  const formatDateTime = (iso: string): string =>
    new Date(iso).toLocaleString(language === 'ar' ? 'ar-YE' : 'en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-gray-500 dark:text-gray-400">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="text-sm">{t('applications:history.loading', 'Loading history...')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
        <AlertCircle className="h-6 w-6 text-red-500 dark:text-red-400" />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('applications:history.error', 'Failed to load application history.')}
        </p>
      </div>
    );
  }

  if (transitions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
        <FileText className="h-6 w-6 text-gray-400 dark:text-gray-500" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('applications:history.empty', 'No history yet.')}
        </p>
      </div>
    );
  }

  return (
    <ol className="space-y-0" dir={isRTL ? 'rtl' : 'ltr'}>
      {transitions.map((transition, index) => {
        const config = STATUS_DOT_CONFIG[transition.to_status] ?? DEFAULT_DOT_CONFIG;
        const Icon = config.icon;
        const isLast = index === transitions.length - 1;
        const roles = transition.actor?.roles ?? [];

        return (
          <li key={transition.id} className="relative flex gap-4 pb-6 last:pb-0">
            {/* Connector line to the next entry */}
            {!isLast && (
              <span
                className="absolute top-9 bottom-0 w-px bg-gray-200 dark:bg-slate-700 rtl:right-3.75 ltr:left-3.75"
                aria-hidden="true"
              />
            )}

            {/* Status dot */}
            <span
              className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${config.className}`}
            >
              <Icon className="h-4 w-4" />
            </span>

            {/* Content */}
            <div className="flex-1 min-w-0 pt-1 space-y-1">
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm">
                {transition.from_status && (
                  <>
                    <span className="text-gray-500 dark:text-gray-400">
                      {t(`applications:status.${transition.from_status}`, transition.from_status)}
                    </span>
                    <span className="text-gray-400 dark:text-gray-500">{isRTL ? '←' : '→'}</span>
                  </>
                )}
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {t(`applications:status.${transition.to_status}`, transition.to_status)}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-gray-500 dark:text-gray-400">
                {transition.actor?.name && (
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {transition.actor.name}
                  </span>
                )}
                {roles.map((role) => (
                  <span
                    key={role}
                    className="rounded-full border border-gray-200 dark:border-slate-700 px-1.5 py-0.5 text-[11px] text-gray-500 dark:text-gray-400"
                  >
                    {t(ROLE_LABEL_KEYS[role] ?? role, role)}
                  </span>
                ))}
                <span>&middot;</span>
                <span>{formatDateTime(transition.created_at)}</span>
              </div>

              {transition.reason && (
                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">
                  {transition.reason}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
};
