import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { useAppDispatch, useAppSelector } from '@/store';
import { usePermissions } from '@/hooks/usePermissions';
import {
  fetchMyTrainingAssignment,
  clearMyTrainingAssignment,
} from '@/store/slices/trainingAssignmentSlice';

/**
 * TEP-666 — replaces the generic "trainings" placeholder card with the
 * student's real training placement status, linking to the full TEP-665/666
 * detail page (/training-assignments). Only rendered for students (see
 * DashboardPage below) — company_representative/academic_supervisor get
 * their own list view at that same route, but this specific dashboard card
 * is the "my training progress" one the ticket asked to wire, so it isn't
 * shown for those roles here.
 */
function MyTrainingPlacementCard() {
  const { t } = useTranslation(['profile', 'trainingAssignments']);
  const dispatch = useAppDispatch();
  const { myAssignment, isFetchingMyAssignment, fetchMyAssignmentErrorCode } = useAppSelector(
    (state) => state.trainingAssignment
  );

  useEffect(() => {
    dispatch(fetchMyTrainingAssignment());
    return () => {
      dispatch(clearMyTrainingAssignment());
    };
  }, [dispatch]);

  const noPlacement = fetchMyAssignmentErrorCode === 'no_active_assignment';

  let valueText = '—';
  let subText = t('dashboard.comingSoon');

  if (isFetchingMyAssignment) {
    subText = t('trainingAssignments:loading');
  } else if (noPlacement) {
    valueText = '—';
    subText = t('trainingAssignments:noPlacementTitle');
  } else if (myAssignment) {
    valueText = `${myAssignment.progress_percentage}%`;
    subText = t(`trainingAssignments:status.${myAssignment.status}`);
  }

  return (
    <Link
      to="/training-assignments"
      className="bg-surface rounded-xl border border-border shadow-sm p-5 flex flex-col gap-2 hover:shadow-md transition-shadow cursor-pointer"
    >
      <p className="text-sm font-medium text-foreground-muted">{t('dashboard.trainings')}</p>
      <p className="text-2xl font-bold text-foreground">{valueText}</p>
      <p className="text-xs text-foreground-muted">{subText}</p>
    </Link>
  );
}

/**
 * DashboardPage — rendered inside <AppLayout> via <ProtectedRoute>.
 *
 * Authentication guarding is handled by ProtectedRoute (no useEffect guard
 * needed here). AppLayout provides the sidebar + header shell.
 */
export function DashboardPage() {
  const { t, i18n } = useTranslation(['profile', 'common']);
  const currentLang = i18n.language || 'ar';
  const { user } = useAppSelector((state) => state.auth);
  const { hasRole } = usePermissions();
  const showTrainingCard = hasRole('student');

  useEffect(() => {
    document.title = `${t('nav.overview')} | ${t('common:pageTitleSuffix')}`;
  }, [t, currentLang]);

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          {user ? `${t('nav.userGreeting')}، ${user.name}` : t('nav.overview')}
        </h1>
        <p className="text-sm text-foreground-muted mt-1">{t('dashboard.accountOverview')}</p>
      </div>

      {/* User info card */}
      {user && (
        <div className="bg-surface rounded-xl border border-border shadow-sm p-6 space-y-4">
          <h2 className="text-base font-semibold text-foreground">{t('dashboard.accountInfo')}</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-foreground-muted">{t('profile.name')}</dt>
              <dd className="font-medium text-foreground text-end">{user.name}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-foreground-muted">{t('profile.email')}</dt>
              <dd className="font-mono text-foreground text-end">{user.email}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-foreground-muted">{t('profile.status')}</dt>
              <dd>
                <span className="text-xs uppercase bg-university-primary/10 text-university-primary inline-block px-2 py-0.5 rounded font-semibold">
                  {t(`profile.userStatuses.${user.status}`, { defaultValue: user.status })}
                </span>
              </dd>
            </div>
            {user.roles && user.roles.length > 0 && (
              <div className="flex items-center justify-between gap-4">
                <dt className="text-foreground-muted">{t('dashboard.role')}</dt>
                <dd className="flex gap-1.5 flex-wrap justify-end">
                  {user.roles.map((r) => (
                    <span
                      key={r.id}
                      className="text-xs bg-surface-hover text-foreground-muted px-2 py-0.5 rounded border border-border"
                    >
                      {currentLang === 'ar' ? r.label?.ar || r.name : r.label?.en || r.name}
                    </span>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {/* Placeholder content — "trainings" is replaced with a real, live
          card for students (TEP-666); requests/evaluations stay
          placeholders, out of this ticket's scope. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {showTrainingCard && <MyTrainingPlacementCard />}
        {(showTrainingCard
          ? [t('dashboard.requests'), t('dashboard.evaluations')]
          : [t('dashboard.trainings'), t('dashboard.requests'), t('dashboard.evaluations')]
        ).map((label) => (
          <div
            key={label}
            className="bg-surface rounded-xl border border-border shadow-sm p-5 flex flex-col gap-2"
          >
            <p className="text-sm font-medium text-foreground-muted">{label}</p>
            <p className="text-2xl font-bold text-foreground">—</p>
            <p className="text-xs text-foreground-muted">{t('dashboard.comingSoon')}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DashboardPage;
