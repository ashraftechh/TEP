import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, Link } from 'react-router';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  fetchApplicationTransitions,
  clearApplicationTransitions,
} from '@/store/slices/applicationSlice';
import { ApplicationTimeline } from '@/components/applications/ApplicationTimeline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, Building2 } from 'lucide-react';

// Same status → badge color language as MyApplicationsPage/CompanyApplicationsPage.
const STATUS_BADGE_CLASSES: Record<string, string> = {
  submitted:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
  under_review:
    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  interview_scheduled:
    'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  accepted:
    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800',
  rejected:
    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800',
  withdrawn:
    'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700',
};

function resolveTitle(title: unknown, language: string): string {
  if (!title) return '';
  if (typeof title === 'string') return title;
  if (typeof title === 'object') {
    const loc = title as Record<string, string>;
    return loc[language] ?? loc['ar'] ?? loc['en'] ?? '';
  }
  return '';
}

/**
 * TEP-658 — Application History / Timeline (student side).
 *
 * This is the destination of the "View History" button on
 * MyApplicationsPage (TEP-637), which previously stub-navigated here with
 * no page to land on. Fetches the ordered transition history via
 * GET /api/v1/applications/{id}/transitions (TEP-657) and renders it with
 * ApplicationTimeline — the same component embedded in the company review
 * dialog (TEP-645), so students and company representatives see identical
 * history rendering.
 *
 * The route only needs the application id — it does not re-fetch the full
 * application/opportunity payload (out of scope for this ticket; no
 * GET /applications/{id} single-resource endpoint exists). If the student
 * arrived via MyApplicationsPage's "View History" button, the matching
 * ApplicationItem is very likely still in the already-loaded
 * `myApplications` list, so the header opportunistically uses it for
 * context (title, company, status) — falling back to a minimal header
 * (just the application id) on a direct/refreshed visit where that list
 * hasn't been fetched yet.
 */
export const ApplicationHistoryPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation(['applications', 'common']);
  const isRTL = i18n.language === 'ar';
  const language = i18n.language;
  const dispatch = useAppDispatch();

  const applicationId = Number(id);

  const { myApplications } = useAppSelector((state) => state.application);
  const {
    applicationTransitions,
    applicationTransitionsAppId,
    isFetchingApplicationTransitions,
    fetchApplicationTransitionsError,
  } = useAppSelector((state) => state.application);

  // Opportunistic header context — see class doc above.
  const matchedApplication = myApplications.find((app) => app.id === applicationId) ?? null;

  useEffect(() => {
    if (!Number.isNaN(applicationId)) {
      dispatch(fetchApplicationTransitions(applicationId));
    }

    return () => {
      dispatch(clearApplicationTransitions());
    };
  }, [dispatch, applicationId]);

  const isCurrent = applicationTransitionsAppId === applicationId;
  const transitions = isCurrent ? applicationTransitions : [];
  const isLoading = isFetchingApplicationTransitions || !isCurrent;

  const opportunityTitle = resolveTitle(matchedApplication?.opportunity?.title, language);
  const companyName = resolveTitle(matchedApplication?.opportunity?.company?.name, language);
  const status = matchedApplication?.status;
  const badgeClass = status
    ? (STATUS_BADGE_CLASSES[status] ?? STATUS_BADGE_CLASSES.withdrawn)
    : null;

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto space-y-6 pb-16" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Back Navigation Bar */}
      <div>
        <Link
          to="/my-applications"
          className="inline-flex items-center gap-1.5 text-xs md:text-sm font-medium text-gray-500 hover:text-university-primary dark:text-gray-400 dark:hover:text-university-primary transition-colors cursor-pointer"
        >
          {isRTL ? (
            <>
              <ArrowRight className="h-4 w-4" />
              <span>{t('applications:history.backToApplications', 'Back to My Applications')}</span>
            </>
          ) : (
            <>
              <ArrowLeft className="h-4 w-4" />
              <span>{t('applications:history.backToApplications', 'Back to My Applications')}</span>
            </>
          )}
        </Link>
      </div>

      <Card className="border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <CardHeader className="border-b border-gray-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-lg">
              {opportunityTitle || t('applications:history.pageTitle', 'Application History')}
            </CardTitle>
            {badgeClass && status && (
              <Badge variant="outline" className={`text-xs font-medium border ${badgeClass}`}>
                {t(`applications:status.${status}`, status)}
              </Badge>
            )}
          </div>
          {companyName && (
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 pt-1">
              <Building2 className="h-4 w-4 shrink-0" />
              <span className="text-sm font-medium">{companyName}</span>
            </div>
          )}
        </CardHeader>
        <CardContent className="pt-6">
          <ApplicationTimeline
            transitions={transitions}
            isLoading={isLoading}
            error={fetchApplicationTransitionsError}
            language={language}
          />
        </CardContent>
      </Card>
    </div>
  );
};
