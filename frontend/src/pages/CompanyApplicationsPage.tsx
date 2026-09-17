import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  fetchCompanyApplications,
  clearCompanyApplications,
  fetchApplicationTransitions,
  clearApplicationTransitions,
} from '@/store/slices/applicationSlice';
import { fetchOpportunities } from '@/store/slices/opportunitySlice';
import { fetchCompanyProfile } from '@/store/slices/companySlice';
import { usePermissions } from '@/hooks/usePermissions';
import HighlightText from '@/components/ui/HighlightText';
import { AcceptApplicationDialog } from '@/components/applications/AcceptApplicationDialog';
import { RejectApplicationDialog } from '@/components/applications/RejectApplicationDialog';
import { ScheduleInterviewDialog } from '@/components/applications/ScheduleInterviewDialog';
import { ReviewApplicationDialog } from '@/components/applications/ReviewApplicationDialog';
import { ApplicationTimeline } from '@/components/applications/ApplicationTimeline';
import type { ApplicationItem } from '@/types/application';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  User,
  GraduationCap,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  FileDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  History,
  AlertTriangle,
} from 'lucide-react';

// ── Status config ──────────────────────────────────────────────────────────
// ASSUMPTION: status enum = ['submitted','under_review','interview_scheduled',
// 'accepted','rejected','withdrawn'] — same flagged open question as the
// backend (MyApplicationsRequest / CompanyApplicationsRequest).
type ApplicationStatus =
  'submitted' | 'under_review' | 'interview_scheduled' | 'accepted' | 'rejected' | 'withdrawn';

const STATUS_BADGE_CLASSES: Record<ApplicationStatus, string> = {
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

const STATUS_ICONS: Record<ApplicationStatus, React.ElementType> = {
  submitted: Clock,
  under_review: Clock,
  interview_scheduled: Calendar,
  accepted: CheckCircle,
  rejected: XCircle,
  withdrawn: XCircle,
};

const STATUS_ICON_CLASSES: Record<ApplicationStatus, string> = {
  submitted: 'text-yellow-600',
  under_review: 'text-blue-600',
  interview_scheduled: 'text-purple-600',
  accepted: 'text-green-600',
  rejected: 'text-red-600',
  withdrawn: 'text-gray-400',
};

const STATUS_FILTER_OPTIONS: ApplicationStatus[] = [
  'submitted',
  'under_review',
  'interview_scheduled',
  'accepted',
  'rejected',
  'withdrawn',
];

// Utility: resolve a translatable object to the current locale string
function resolveTitle(title: unknown, language: string): string {
  if (!title) return '';
  if (typeof title === 'string') return title;
  if (typeof title === 'object') {
    const loc = title as Record<string, string>;
    return loc[language] ?? loc['ar'] ?? loc['en'] ?? '';
  }
  return '';
}

// ── Application Row ────────────────────────────────────────────────────────
interface ApplicationRowProps {
  application: ApplicationItem;
  language: string;
  canReview: boolean;
  isSuspended: boolean;
  searchTerm: string;
  onView: (application: ApplicationItem) => void;
  onAction: (
    application: ApplicationItem,
    action: 'review' | 'interview' | 'accept' | 'reject'
  ) => void;
}

const ApplicationRow: React.FC<ApplicationRowProps> = ({
  application,
  language,
  canReview,
  isSuspended,
  searchTerm,
  onView,
  onAction,
}) => {
  const { t } = useTranslation(['applications', 'common']);

  const status = application.status as ApplicationStatus;
  const badgeClass = STATUS_BADGE_CLASSES[status] ?? STATUS_BADGE_CLASSES.withdrawn;
  const StatusIcon = STATUS_ICONS[status] ?? Clock;

  const profile = application.student_profile;
  const studentName = profile?.user?.name ?? '—';
  const studentNumber = profile?.student_number ?? '';
  const majorName = resolveTitle(profile?.major?.name, language);
  const opportunityTitle = resolveTitle(application.opportunity?.title, language);

  const appliedDate = new Date(application.submitted_at).toLocaleDateString(
    language === 'ar' ? 'ar-SA' : 'en-GB',
    { year: 'numeric', month: 'short', day: 'numeric' }
  );

  const skills = profile?.skills ?? [];
  const displayedSkills = skills.slice(0, 3);
  const remainingSkillsCount = skills.length - displayedSkills.length;
  const [imageError, setImageError] = useState(false);

  // Mirrors the approved prototype's action rules exactly:
  // - submitted: Review, Schedule Interview, Accept, Reject, View
  // - under_review: Schedule Interview, Accept, Reject, View (no Review — already reviewing)
  // - everything else (interview_scheduled, accepted, rejected, withdrawn): View only
  const showReview = status === 'submitted';
  const showDecisionActions = status === 'submitted' || status === 'under_review';

  // TEP-654: Schedule Interview's own visibility is broader than
  // showDecisionActions above — an application already in
  // interview_scheduled must still show the action, just relabeled
  // "Reschedule" with the existing time pre-filled (per TEP-654's spec).
  // FLAGGED, not fixed here: showDecisionActions (accept/reject) still
  // excludes interview_scheduled even though the backend's ACTIVE_STATUSES
  // (TEP-648/649) permits accepting/rejecting from interview_scheduled too
  // — that's the prototype's own pre-existing UX choice from TEP-645/650,
  // out of this subtask's boundary, noted rather than changed inline.
  const showInterviewAction = showDecisionActions || status === 'interview_scheduled';

  return (
    <Card className="hover:shadow-md transition-shadow duration-200 border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          {/* Left/main: avatar + details */}
          <div className="flex gap-4 flex-1 min-w-0">
            {/* key remounts Avatar when avatar_url changes, resetting imageError without useEffect */}
            <Avatar key={profile?.avatar_url ?? 'no-avatar'} className="h-12 w-12 shrink-0">
              {profile?.avatar_url && !imageError ? (
                <AvatarImage
                  src={profile.avatar_url}
                  alt={studentName}
                  className="object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <AvatarFallback>
                  <User className="h-6 w-6" />
                </AvatarFallback>
              )}
            </Avatar>

            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusIcon className={`h-4 w-4 shrink-0 ${STATUS_ICON_CLASSES[status]}`} />
                <h3 className="font-medium text-gray-900 dark:text-gray-100">
                  <HighlightText text={studentName} query={searchTerm} />
                </h3>
                <Badge variant="outline" className={`text-xs font-medium border ${badgeClass}`}>
                  {t(`applications:status.${status}`, status)}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
                {studentNumber && (
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3 shrink-0" />
                    <HighlightText text={studentNumber} query={searchTerm} />
                  </div>
                )}
                {majorName && (
                  <div className="flex items-center gap-1">
                    <GraduationCap className="h-3 w-3 shrink-0" />
                    <span>{majorName}</span>
                  </div>
                )}
                {profile?.user?.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="h-3 w-3 shrink-0" />
                    <span className="truncate">{profile.user.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 shrink-0" />
                  <span>{appliedDate}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {opportunityTitle && (
                  <Badge variant="secondary">
                    <HighlightText text={opportunityTitle} query={searchTerm} />
                  </Badge>
                )}
                {profile?.gpa !== undefined && profile?.gpa !== null && (
                  <Badge variant="outline">
                    {t('applications:gpa', 'GPA')}: {profile.gpa}
                  </Badge>
                )}
              </div>

              {skills.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  {displayedSkills.map((skill) => (
                    <Badge
                      key={skill.id}
                      variant="outline"
                      className="rounded-full px-2.5 py-0.5 text-xs font-normal border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300"
                    >
                      {resolveTitle(skill.name, language)}
                    </Badge>
                  ))}
                  {remainingSkillsCount > 0 && (
                    <Badge
                      variant="outline"
                      className="rounded-full px-2 py-0.5 text-xs font-normal border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400"
                    >
                      +{remainingSkillsCount}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: action buttons */}
          <div className="flex flex-wrap gap-2 md:justify-end shrink-0">
            {application.cv_file?.url && (
              <a
                href={application.cv_file.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium shadow-xs hover:bg-accent transition-colors cursor-pointer"
              >
                <FileDown className="h-4 w-4" />
                {t('applications:downloadCv', 'CV')}
              </a>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => onView(application)}
              className="cursor-pointer"
            >
              <Eye className="h-4 w-4 me-1" />
              {t('applications:viewApplication', 'View Application')}
            </Button>

            {canReview && showReview && (
              <Button
                size="sm"
                disabled={isSuspended}
                title={
                  isSuspended
                    ? t(
                        'applications:suspendedActionDisabled',
                        'الإجراء غير متاح أثناء تعليق الحساب'
                      )
                    : undefined
                }
                onClick={() => onAction(application, 'review')}
                className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('applications:startReview', 'Review')}
              </Button>
            )}

            {canReview && showInterviewAction && (
              <Button
                size="sm"
                disabled={isSuspended}
                title={
                  isSuspended
                    ? t(
                        'applications:suspendedActionDisabled',
                        'الإجراء غير متاح أثناء تعليق الحساب'
                      )
                    : undefined
                }
                onClick={() => onAction(application, 'interview')}
                className="cursor-pointer bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === 'interview_scheduled'
                  ? t('applications:reschedule', 'Reschedule')
                  : t('applications:scheduleInterview', 'Schedule Interview')}
              </Button>
            )}

            {canReview && showDecisionActions && (
              <>
                <Button
                  size="sm"
                  disabled={isSuspended}
                  title={
                    isSuspended
                      ? t(
                          'applications:suspendedActionDisabled',
                          'الإجراء غير متاح أثناء تعليق الحساب'
                        )
                      : undefined
                  }
                  onClick={() => onAction(application, 'accept')}
                  className="cursor-pointer bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('applications:accept', 'Accept')}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isSuspended}
                  title={
                    isSuspended
                      ? t(
                          'applications:suspendedActionDisabled',
                          'الإجراء غير متاح أثناء تعليق الحساب'
                        )
                      : undefined
                  }
                  onClick={() => onAction(application, 'reject')}
                  className="cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('applications:reject', 'Reject')}
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ── View Application Dialog ────────────────────────────────────────────────
interface ViewApplicationDialogProps {
  application: ApplicationItem | null;
  language: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ViewApplicationDialog: React.FC<ViewApplicationDialogProps> = ({
  application,
  language,
  open,
  onOpenChange,
}) => {
  const { t } = useTranslation(['applications', 'common']);
  const dispatch = useAppDispatch();
  // All hooks must be called unconditionally before any early returns
  const [imageError, setImageError] = useState(false);

  const {
    applicationTransitions,
    applicationTransitionsAppId,
    isFetchingApplicationTransitions,
    fetchApplicationTransitionsError,
  } = useAppSelector((state) => state.application);

  const applicationId = application?.id;

  useEffect(() => {
    if (open && applicationId) {
      dispatch(fetchApplicationTransitions(applicationId));
    }

    if (!open) {
      dispatch(clearApplicationTransitions());
    }
  }, [dispatch, open, applicationId]);

  if (!application) return null;

  const isTransitionsCurrent = applicationTransitionsAppId === applicationId;
  const transitions = isTransitionsCurrent ? applicationTransitions : [];
  const isTransitionsLoading = isFetchingApplicationTransitions || !isTransitionsCurrent;

  const status = application.status as ApplicationStatus;
  const badgeClass = STATUS_BADGE_CLASSES[status] ?? STATUS_BADGE_CLASSES.withdrawn;
  const profile = application.student_profile;
  const majorName = resolveTitle(profile?.major?.name, language);
  const opportunityTitle = resolveTitle(application.opportunity?.title, language);
  const appliedDate = new Date(application.submitted_at).toLocaleDateString(
    language === 'ar' ? 'ar-SA' : 'en-GB',
    { year: 'numeric', month: 'short', day: 'numeric' }
  );

  // Phone: prefer profile.phone (student filled) then user.phone (account level)
  const phone = profile?.phone ?? profile?.user?.phone;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('applications:studentDetails', 'Student Details')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* ── Header: Avatar + name + meta + status badge ── */}
          <div className="flex items-start gap-4">
            {/* key remounts Avatar when student or dialog open/close changes, resetting imageError */}
            <Avatar
              key={`${profile?.avatar_url ?? 'no-avatar'}-${open}`}
              className="h-16 w-16 shrink-0 border border-border"
            >
              {profile?.avatar_url && !imageError ? (
                <AvatarImage
                  src={profile.avatar_url}
                  alt={profile?.user?.name ?? '—'}
                  className="object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <AvatarFallback>
                  <User className="h-8 w-8" />
                </AvatarFallback>
              )}
            </Avatar>
            <div className="space-y-1 min-w-0">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                {profile?.user?.name ?? '—'}
              </h2>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-gray-500 dark:text-gray-400">
                {profile?.student_number && <span>{profile.student_number}</span>}
                {majorName && (
                  <>
                    <span className="text-gray-300 dark:text-gray-600">•</span>
                    <span>{majorName}</span>
                  </>
                )}
                {profile?.gpa !== undefined && profile?.gpa !== null && (
                  <>
                    <span className="text-gray-300 dark:text-gray-600">•</span>
                    <span>GPA: {profile.gpa}</span>
                  </>
                )}
              </div>
              <Badge variant="outline" className={`text-xs font-medium border ${badgeClass}`}>
                {t(`applications:status.${status}`, status)}
              </Badge>
            </div>
          </div>

          {/* ── Contact Information ── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {t('applications:contactInfo', 'Contact Information')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-sm">
              {profile?.user?.email && (
                <div className="flex items-center gap-2.5">
                  <Mail className="h-4 w-4 shrink-0 text-gray-400" />
                  <span dir="ltr" className="text-gray-700 dark:text-gray-300">
                    {profile.user.email}
                  </span>
                </div>
              )}
              {phone && (
                <div className="flex items-center gap-2.5">
                  <Phone className="h-4 w-4 shrink-0 text-gray-400" />
                  <span dir="ltr" className="text-gray-700 dark:text-gray-300">
                    {phone}
                  </span>
                </div>
              )}
              {profile?.university_name && (
                <div className="flex items-center gap-2.5">
                  <MapPin className="h-4 w-4 shrink-0 text-gray-400" />
                  <span className="text-gray-700 dark:text-gray-300">
                    {profile.university_name}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Application Details ── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {t('applications:applicationDetails', 'Application Details')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {opportunityTitle && (
                <div>
                  <span className="font-medium">
                    {t('applications:appliedFor', 'Applied for')}:{' '}
                  </span>
                  <span className="text-gray-700 dark:text-gray-300">{opportunityTitle}</span>
                </div>
              )}
              <div>
                <span className="font-medium">
                  {t('applications:appliedDate', 'Applied date')}:{' '}
                </span>
                <span className="text-gray-700 dark:text-gray-300">{appliedDate}</span>
              </div>
              {profile?.skills && profile.skills.length > 0 && (
                <div>
                  <p className="font-medium mb-1.5">{t('applications:skills', 'Skills')}:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.skills.map((skill) => (
                      <Badge
                        key={skill.id}
                        variant="outline"
                        className="rounded-full px-2.5 py-0.5 text-xs font-normal border-gray-200 dark:border-slate-700"
                      >
                        {resolveTitle(skill.name, language)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {profile?.bio && (
                <div>
                  <p className="font-medium mb-1">{t('applications:experience', 'Experience')}:</p>
                  <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">
                    {profile.bio}
                  </p>
                </div>
              )}
              {application.cover_note && (
                <div>
                  <p className="font-medium mb-1">{t('applications:coverNote', 'Cover note')}:</p>
                  <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">
                    {application.cover_note}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── History (TEP-657/658) ── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4" />
                {t('applications:history.pageTitle', 'Application History')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ApplicationTimeline
                transitions={transitions}
                isLoading={isTransitionsLoading}
                error={fetchApplicationTransitionsError}
                language={language}
              />
            </CardContent>
          </Card>

          {/* ── Actions ── */}
          <div className="flex justify-end pt-1">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="cursor-pointer"
            >
              {t('applications:close', 'Close')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────
export const CompanyApplicationsPage: React.FC = () => {
  const { t, i18n } = useTranslation(['applications', 'common']);
  const isRTL = i18n.language === 'ar';
  const language = i18n.language;
  const dispatch = useAppDispatch();
  const { can } = usePermissions();
  const canReview = can('applications.company.review');

  const {
    companyApplications,
    companyApplicationsPagination,
    isFetchingCompanyApplications,
    fetchCompanyApplicationsError,
  } = useAppSelector((state) => state.application);
  const { opportunities } = useAppSelector((state) => state.opportunity);
  const { company } = useAppSelector((state) => state.company);
  const isSuspended = company?.status === 'suspended';

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [opportunityFilter, setOpportunityFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [viewedApplication, setViewedApplication] = useState<ApplicationItem | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  // TEP-650: Accept/Reject dialogs slot into TEP-645's list shell.
  const [decisionApplication, setDecisionApplication] = useState<ApplicationItem | null>(null);
  const [isAcceptDialogOpen, setIsAcceptDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);

  // TEP-654: Schedule Interview dialog slots into TEP-645's list shell,
  // same pattern as the Accept/Reject dialogs above.
  const [interviewApplication, setInterviewApplication] = useState<ApplicationItem | null>(null);
  const [isInterviewDialogOpen, setIsInterviewDialogOpen] = useState(false);

  // TEP-652: Review dialog slots into TEP-645's list shell
  const [reviewApplicationItem, setReviewApplicationItem] = useState<ApplicationItem | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);

  useEffect(() => {
    document.title = `${t('applications:companyTitle', 'Applications Management')} | ${t('common:pageTitleSuffix')}`;
  }, [t, i18n.language]);

  // Populate the opportunity filter dropdown — reuses the existing
  // fetchOpportunities thunk, which the backend already scopes to the
  // acting representative's own company (OpportunityController::index()).
  useEffect(() => {
    dispatch(fetchOpportunities({ per_page: 100 }));
  }, [dispatch]);

  useEffect(() => {
    if (!company) {
      dispatch(fetchCompanyProfile());
    }
  }, [dispatch, company]);

  useEffect(() => {
    const params: Record<string, string | number> = { page: currentPage };
    if (statusFilter !== 'all') params.status = statusFilter;
    if (opportunityFilter !== 'all') params.opportunity_id = opportunityFilter;
    dispatch(fetchCompanyApplications(params));
  }, [dispatch, statusFilter, opportunityFilter, currentPage]);

  useEffect(() => {
    return () => {
      dispatch(clearCompanyApplications());
    };
  }, [dispatch]);

  const handleStatusChange = useCallback((value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  }, []);

  const handleOpportunityChange = useCallback((value: string) => {
    setOpportunityFilter(value);
    setCurrentPage(1);
  }, []);

  const handleRetry = useCallback(() => {
    const params: Record<string, string | number> = { page: currentPage };
    if (statusFilter !== 'all') params.status = statusFilter;
    if (opportunityFilter !== 'all') params.opportunity_id = opportunityFilter;
    dispatch(fetchCompanyApplications(params));
  }, [dispatch, statusFilter, opportunityFilter, currentPage]);

  const handleView = useCallback((application: ApplicationItem) => {
    setViewedApplication(application);
    setIsViewDialogOpen(true);
  }, []);

  // Accept / Reject (TEP-648/649), Schedule Interview (TEP-653/654),
  // and Review (TEP-652) now open their real dialogs, built on top of this
  // list/filter shell from TEP-645.
  const handleAction = useCallback(
    (application: ApplicationItem, action: 'review' | 'interview' | 'accept' | 'reject') => {
      if (action === 'review') {
        setReviewApplicationItem(application);
        setIsReviewDialogOpen(true);
        return;
      }

      if (action === 'accept') {
        setDecisionApplication(application);
        setIsAcceptDialogOpen(true);
        return;
      }

      if (action === 'reject') {
        setDecisionApplication(application);
        setIsRejectDialogOpen(true);
        return;
      }

      if (action === 'interview') {
        setInterviewApplication(application);
        setIsInterviewDialogOpen(true);
        return;
      }
    },
    []
  );

  const handleDecisionSuccess = useCallback(() => {
    setDecisionApplication(null);
  }, []);

  const handleInterviewSuccess = useCallback(() => {
    setInterviewApplication(null);
  }, []);

  const handleReviewSuccess = useCallback(() => {
    setReviewApplicationItem(null);
  }, []);

  const selectedStatusLabel = useMemo(() => {
    if (statusFilter === 'all') return t('applications:all');
    return t(`applications:status.${statusFilter}`, statusFilter);
  }, [statusFilter, t]);

  const selectedOpportunityLabel = useMemo(() => {
    if (opportunityFilter === 'all') return t('applications:allOpportunities', 'All Opportunities');
    const found = opportunities.find((o) => String(o.id) === opportunityFilter);
    return found ? resolveTitle(found.title, language) : opportunityFilter;
  }, [opportunityFilter, opportunities, language, t]);

  // Search is applied client-side over the current page's results (name,
  // student number, opportunity title) — filtering itself (status,
  // opportunity) is server-side via the API params above.
  const visibleApplications = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return companyApplications;
    return companyApplications.filter((app) => {
      const name = app.student_profile?.user?.name?.toLowerCase() ?? '';
      const studentNumber = app.student_profile?.student_number?.toLowerCase() ?? '';
      const oppTitle = resolveTitle(app.opportunity?.title, language).toLowerCase();
      return name.includes(term) || studentNumber.includes(term) || oppTitle.includes(term);
    });
  }, [companyApplications, searchTerm, language]);

  const isEmpty = !isFetchingCompanyApplications && visibleApplications.length === 0;

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6 pb-12" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Page header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white mb-2">
          {t('applications:companyTitle', 'Applications Management')}
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('applications:companySubtitle', 'Review and manage student training applications')}
        </p>
      </div>

      {/* Suspension banner */}
      {isSuspended && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold">
              {t('applications:companySuspendedTitle', 'الحساب معلق مؤقتاً')}
            </h3>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              {t(
                'applications:companySuspendedDesc',
                'تم تعليق حساب شركتكم. لا يمكن قبول طلبات التدريب أو جدولة المقابلات في الوقت الحالي.'
              )}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <Card className="border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search
                  className={`absolute top-3 ${isRTL ? 'right-3' : 'left-3'} h-4 w-4 text-gray-400`}
                />
                <Input
                  placeholder={t('applications:search', 'Search applications...')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={isRTL ? 'pr-10' : 'pl-10'}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={statusFilter} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-full sm:w-40 cursor-pointer dark:bg-gray-800 dark:border-gray-700">
                  <SelectValue placeholder={t('applications:filterStatus')}>
                    {selectedStatusLabel}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="cursor-pointer">
                    {t('applications:all')}
                  </SelectItem>
                  {STATUS_FILTER_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s} className="cursor-pointer">
                      {t(`applications:status.${s}`, s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={opportunityFilter} onValueChange={handleOpportunityChange}>
                <SelectTrigger className="w-full sm:w-48 cursor-pointer dark:bg-gray-800 dark:border-gray-700">
                  <SelectValue placeholder={t('applications:filterOpportunity', 'Opportunity')}>
                    {selectedOpportunityLabel}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="cursor-pointer">
                    {t('applications:allOpportunities', 'All Opportunities')}
                  </SelectItem>
                  {opportunities.map((opp) => (
                    <SelectItem key={opp.id} value={String(opp.id)} className="cursor-pointer">
                      {resolveTitle(opp.title, language)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading state */}
      {isFetchingCompanyApplications && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ms-3 text-gray-500 dark:text-gray-400">{t('applications:loading')}</span>
        </div>
      )}

      {/* Error state */}
      {!isFetchingCompanyApplications && fetchCompanyApplicationsError && (
        <Card className="border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-10 w-10 mx-auto mb-3 text-red-400" />
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t(
                'applications:errorLoadingCompany',
                'Failed to load applications. Please try again.'
              )}
            </p>
            <Button variant="outline" onClick={handleRetry} className="cursor-pointer">
              {t('applications:retry')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!isFetchingCompanyApplications && !fetchCompanyApplicationsError && isEmpty && (
        <Card className="border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <CardContent className="p-8 text-center text-gray-500 dark:text-gray-400">
            <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{t('applications:noCompanyApplications', 'No applications match your search')}</p>
          </CardContent>
        </Card>
      )}

      {/* Application rows */}
      {!isFetchingCompanyApplications &&
        !fetchCompanyApplicationsError &&
        visibleApplications.length > 0 && (
          <div className="space-y-4">
            {visibleApplications.map((application) => (
              <ApplicationRow
                key={application.id}
                application={application}
                language={language}
                canReview={canReview}
                isSuspended={isSuspended}
                searchTerm={searchTerm}
                onView={handleView}
                onAction={handleAction}
              />
            ))}
          </div>
        )}

      {/* Pagination Controls */}
      {!isFetchingCompanyApplications &&
        !searchTerm &&
        companyApplicationsPagination &&
        companyApplicationsPagination.total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-200 dark:border-slate-800">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {isRTL ? (
                <span>
                  عرض {companyApplicationsPagination.from || 1} إلى{' '}
                  {companyApplicationsPagination.to || companyApplications.length} من أصل{' '}
                  {companyApplicationsPagination.total} طلب
                </span>
              ) : (
                <span>
                  Showing {companyApplicationsPagination.from || 1} to{' '}
                  {companyApplicationsPagination.to || companyApplications.length} of{' '}
                  {companyApplicationsPagination.total} applications
                </span>
              )}
            </div>

            <div className="flex items-center flex-wrap justify-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1 || isFetchingCompanyApplications}
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                className="text-xs cursor-pointer h-8 px-2.5"
              >
                {isRTL ? (
                  <>
                    <ChevronRight className="h-3.5 w-3.5 me-1" />
                    السابق
                  </>
                ) : (
                  <>
                    <ChevronLeft className="h-3.5 w-3.5 me-1" />
                    Previous
                  </>
                )}
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: companyApplicationsPagination.last_page }, (_, i) => i + 1)
                  .filter((p) => {
                    return (
                      p === 1 ||
                      p === companyApplicationsPagination.last_page ||
                      Math.abs(p - currentPage) <= 1
                    );
                  })
                  .map((pageNum, idx, arr) => {
                    const prevPage = arr[idx - 1];
                    const showEllipsis = prevPage && pageNum - prevPage > 1;
                    return (
                      <React.Fragment key={pageNum}>
                        {showEllipsis && <span className="text-xs text-gray-400 px-1">…</span>}
                        <Button
                          variant={currentPage === pageNum ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          disabled={isFetchingCompanyApplications}
                          className={`h-8 w-8 p-0 text-xs cursor-pointer ${
                            currentPage === pageNum
                              ? 'bg-university-primary text-white border-university-primary'
                              : ''
                          }`}
                        >
                          {pageNum}
                        </Button>
                      </React.Fragment>
                    );
                  })}
              </div>

              <Button
                variant="outline"
                size="sm"
                disabled={
                  currentPage >= companyApplicationsPagination.last_page ||
                  isFetchingCompanyApplications
                }
                onClick={() =>
                  setCurrentPage((prev) =>
                    Math.min(companyApplicationsPagination.last_page, prev + 1)
                  )
                }
                className="text-xs cursor-pointer h-8 px-2.5"
              >
                {isRTL ? (
                  <>
                    التالي
                    <ChevronLeft className="h-3.5 w-3.5 ms-1" />
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="h-3.5 w-3.5 ms-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

      <ViewApplicationDialog
        application={viewedApplication}
        language={language}
        open={isViewDialogOpen}
        onOpenChange={setIsViewDialogOpen}
      />

      <AcceptApplicationDialog
        isOpen={isAcceptDialogOpen}
        onClose={() => setIsAcceptDialogOpen(false)}
        application={decisionApplication}
        onSuccess={handleDecisionSuccess}
      />

      <RejectApplicationDialog
        isOpen={isRejectDialogOpen}
        onClose={() => setIsRejectDialogOpen(false)}
        application={decisionApplication}
        onSuccess={handleDecisionSuccess}
      />

      <ScheduleInterviewDialog
        isOpen={isInterviewDialogOpen}
        onClose={() => setIsInterviewDialogOpen(false)}
        application={interviewApplication}
        onSuccess={handleInterviewSuccess}
      />

      <ReviewApplicationDialog
        isOpen={isReviewDialogOpen}
        onClose={() => setIsReviewDialogOpen(false)}
        application={reviewApplicationItem}
        onSuccess={handleReviewSuccess}
      />
    </div>
  );
};

export default CompanyApplicationsPage;
