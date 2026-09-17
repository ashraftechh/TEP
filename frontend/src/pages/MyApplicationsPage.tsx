import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useAppDispatch, useAppSelector } from '@/store';
import { fetchMyApplications, clearMyApplications } from '@/store/slices/applicationSlice';
import { WithdrawApplicationDialog } from '@/components/applications/WithdrawApplicationDialog';
import type { ApplicationItem } from '@/types/application';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  Building2,
  MapPin,
  Clock,
  Calendar,
  Loader2,
  FileText,
  History,
  AlertCircle,
  Globe,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import HighlightText from '@/components/ui/HighlightText';

// ── Status badge config ────────────────────────────────────────────────────
// ASSUMPTION: status enum = ['submitted','under_review','interview_scheduled',
// 'accepted','rejected','withdrawn'] — flagged open question, same as backend.
// Badge colors follow the prototype mapping with added 'withdrawn' (grey/muted,
// consistent with the Archive-not-Delete visual language from Sprint 2).
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
  // Withdrawn: grey/muted — consistent with Archive visual language (Sprint 2)
  withdrawn:
    'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700',
};

// Utility: resolve a translatable title object to the current locale string
function resolveTitle(title: unknown, language: string): string {
  if (!title) return '';
  if (typeof title === 'string') return title;
  if (typeof title === 'object') {
    const loc = title as Record<string, string>;
    return loc[language] ?? loc['ar'] ?? loc['en'] ?? '';
  }
  return '';
}

// ── Application Card ───────────────────────────────────────────────────────
interface ApplicationCardProps {
  application: ApplicationItem;
  language: string;
  searchTerm: string;
  onWithdraw: (application: ApplicationItem) => void;
}

const ApplicationCard: React.FC<ApplicationCardProps> = ({
  application,
  language,
  searchTerm,
  onWithdraw,
}) => {
  const { t } = useTranslation(['applications', 'common']);
  const navigate = useNavigate();

  const status = application.status as ApplicationStatus;
  const badgeClass = STATUS_BADGE_CLASSES[status] ?? STATUS_BADGE_CLASSES.withdrawn;

  const opportunityTitle = resolveTitle(application.opportunity?.title, language);
  const companyName = resolveTitle(application.opportunity?.company?.name, language);
  const location = application.opportunity?.location;
  const duration = application.opportunity?.duration;
  const isRemote = application.opportunity?.is_remote;

  // Date formatting: use ar-YE for Arabic (this is a Yemeni university, not ar-SA)
  const appliedDate = new Date(application.submitted_at).toLocaleDateString(
    language === 'ar' ? 'ar-YE' : 'en-GB',
    { year: 'numeric', month: 'short', day: 'numeric' }
  );

  const lastUpdatedDate = application.latest_transition?.created_at
    ? new Date(application.latest_transition.created_at).toLocaleDateString(
        language === 'ar' ? 'ar-YE' : 'en-GB',
        { year: 'numeric', month: 'short', day: 'numeric' }
      )
    : null;

  const handleViewHistory = useCallback(() => {
    // TEP-658: history/timeline page (out of scope for this ticket — stub navigation)
    navigate(`/applications/${application.id}/history`);
  }, [application.id, navigate]);

  const handleWithdraw = useCallback(() => {
    // TEP-641: opens the confirmation dialog (owned by the parent page so a
    // single dialog instance is reused instead of one per card).
    onWithdraw(application);
  }, [application, onWithdraw]);

  return (
    <Card className="group hover:shadow-md transition-shadow duration-200 border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          {/* Left: content */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Title + badge */}
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                <HighlightText text={opportunityTitle} query={searchTerm} />
              </h3>
              <Badge variant="outline" className={`text-xs font-medium border ${badgeClass}`}>
                {t(`applications:status.${status}`, status)}
              </Badge>
            </div>

            {/* Company */}
            {companyName && (
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Building2 className="h-4 w-4 shrink-0" />
                <span className="text-sm font-medium">
                  <HighlightText text={companyName} query={searchTerm} />
                </span>
              </div>
            )}

            {/* Meta row */}
            <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-500">
              {(location || isRemote) && (
                <span className="flex items-center gap-1">
                  {isRemote ? (
                    <Globe className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span>{isRemote ? t('applications:remote') : location}</span>
                </span>
              )}
              {duration && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 shrink-0" />
                  <span>{duration}</span>
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {t('applications:appliedOn')}: {appliedDate}
                </span>
              </span>
              {lastUpdatedDate && (
                <span className="flex items-center gap-1">
                  <History className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {t('applications:lastUpdated')}: {lastUpdatedDate}
                  </span>
                </span>
              )}
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex gap-2 shrink-0">
            {/* View History — TEP-658 stub */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewHistory}
              className="cursor-pointer dark:border-gray-700 dark:hover:bg-gray-800"
            >
              <History className="h-3.5 w-3.5 me-1.5" />
              {t('applications:viewHistory')}
            </Button>

            {/* Withdraw — shown only when API says can_withdraw === true (TEP-641 stub) */}
            {application.can_withdraw && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleWithdraw}
                className="cursor-pointer"
              >
                {t('applications:withdraw')}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────
export const MyApplicationsPage: React.FC = () => {
  const { t, i18n } = useTranslation(['applications', 'common']);
  const isRTL = i18n.language === 'ar';
  const language = i18n.language;
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const {
    myApplications,
    myApplicationsPagination,
    isFetchingMyApplications,
    fetchMyApplicationsError,
  } = useAppSelector((state) => state.application);
  const { opportunityTypes } = useAppSelector((state) => state.lookup);

  // Status filter is local UI state (not shared across screens)
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Withdraw dialog (TEP-641) — local UI state, one dialog instance shared
  // by every card in the list.
  const [withdrawTarget, setWithdrawTarget] = useState<ApplicationItem | null>(null);

  const handleOpenWithdraw = useCallback((application: ApplicationItem) => {
    setWithdrawTarget(application);
  }, []);

  const handleCloseWithdraw = useCallback(() => {
    setWithdrawTarget(null);
  }, []);

  // Set document title
  useEffect(() => {
    document.title = `${t('applications:title')} | ${t('common:pageTitleSuffix')}`;
  }, [t, i18n.language]);

  // Fetch on mount and whenever filter changes
  useEffect(() => {
    const params: Record<string, string | number> = {
      page: currentPage,
    };
    if (statusFilter !== 'all') params.status = statusFilter;
    if (typeFilter !== 'all') params.opportunity_type_id = typeFilter;
    if (searchTerm.trim()) params.q = searchTerm.trim();
    dispatch(fetchMyApplications(params));
  }, [dispatch, statusFilter, typeFilter, searchTerm, currentPage]);

  // Reset list on unmount
  useEffect(() => {
    return () => {
      dispatch(clearMyApplications());
    };
  }, [dispatch]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  }, []);

  const handleStatusChange = useCallback((value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  }, []);

  const handleTypeChange = useCallback((value: string) => {
    setTypeFilter(value);
    setCurrentPage(1);
  }, []);

  const handleClearFilter = useCallback(() => {
    setStatusFilter('all');
    setTypeFilter('all');
    setSearchTerm('');
    setCurrentPage(1);
  }, []);

  const handleRetry = useCallback(() => {
    const params: Record<string, string | number> = {
      page: currentPage,
    };
    if (statusFilter !== 'all') params.status = statusFilter;
    if (typeFilter !== 'all') params.opportunity_type_id = typeFilter;
    if (searchTerm.trim()) params.q = searchTerm.trim();
    dispatch(fetchMyApplications(params));
  }, [dispatch, statusFilter, typeFilter, searchTerm, currentPage]);

  const STATUS_FILTER_OPTIONS: ApplicationStatus[] = [
    'submitted',
    'under_review',
    'interview_scheduled',
    'accepted',
    'rejected',
    'withdrawn',
  ];

  const selectedTypeLabel = useMemo(() => {
    if (typeFilter === 'all') return isRTL ? 'كل الأنواع' : 'All Types';
    const found = opportunityTypes.find((ot) => String(ot.id) === typeFilter);
    return found ? resolveTitle(found.name, language) : typeFilter;
  }, [typeFilter, opportunityTypes, isRTL, language]);

  const selectedStatusLabel = useMemo(() => {
    if (statusFilter === 'all') return t('applications:all', 'الكل');
    return t(`applications:status.${statusFilter}`, statusFilter);
  }, [statusFilter, t]);

  const isEmpty = !isFetchingMyApplications && myApplications.length === 0;
  const hasFilter = statusFilter !== 'all' || typeFilter !== 'all' || searchTerm.trim() !== '';

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6 pb-12" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Page header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
          <FileText className="h-7 w-7 text-university-primary" />
          {t('applications:title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {t('applications:subtitle')}
        </p>
      </div>

      {/* Filter bar */}
      <Card className="border-gray-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900">
        <CardContent className="p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* Search Input (5 cols) */}
            <div className="md:col-span-5 relative">
              <Search
                className={`absolute top-2.5 ${isRTL ? 'right-3' : 'left-3'} h-4 w-4 text-gray-400`}
              />
              <Input
                placeholder={t('applications:search', 'البحث في الطلبات...')}
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className={isRTL ? 'pr-9' : 'pl-9'}
              />
            </div>

            {/* Type Filter (3 cols) */}
            <div className="md:col-span-3">
              <Select value={typeFilter} onValueChange={handleTypeChange}>
                <SelectTrigger className="w-full cursor-pointer dark:bg-gray-800 dark:border-gray-700">
                  <SelectValue placeholder={t('applications:trainingType', 'نوع التدريب')}>
                    {selectedTypeLabel}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="cursor-pointer">
                    {isRTL ? 'كل الأنواع' : 'All Types'}
                  </SelectItem>
                  {opportunityTypes.map((type) => (
                    <SelectItem key={type.id} value={String(type.id)} className="cursor-pointer">
                      {resolveTitle(type.name, language)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter (4 cols) */}
            <div className="md:col-span-4 flex items-center gap-3">
              <Select value={statusFilter} onValueChange={handleStatusChange}>
                <SelectTrigger
                  id="my-applications-status-filter"
                  className="flex-1 cursor-pointer dark:bg-gray-800 dark:border-gray-700"
                >
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

              {hasFilter && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilter}
                  className="cursor-pointer text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 shrink-0"
                >
                  {t('applications:clearFilter')}
                </Button>
              )}

              {/* Pagination summary */}
              {myApplicationsPagination && myApplicationsPagination.total > 0 && (
                <span className="text-sm text-gray-500 dark:text-gray-400 shrink-0">
                  {myApplicationsPagination.total}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading state */}
      {isFetchingMyApplications && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ms-3 text-gray-500 dark:text-gray-400">{t('applications:loading')}</span>
        </div>
      )}

      {/* Error state */}
      {!isFetchingMyApplications && fetchMyApplicationsError && (
        <Card className="border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-10 w-10 mx-auto mb-3 text-red-400" />
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {t('applications:errorLoading')}
            </p>
            <Button variant="outline" onClick={handleRetry} className="cursor-pointer">
              {t('applications:retry')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty state: no applications at all */}
      {!isFetchingMyApplications && !fetchMyApplicationsError && isEmpty && !hasFilter && (
        <Card className="border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {t('applications:noApplications')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
              {t('applications:noApplicationsSubtitle')}
            </p>
            <Button onClick={() => navigate('/opportunities')} className="cursor-pointer">
              {t('applications:browseOpportunities')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Empty state: filter returned nothing */}
      {!isFetchingMyApplications && !fetchMyApplicationsError && isEmpty && hasFilter && (
        <Card className="border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <CardContent className="p-10 text-center">
            <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('applications:noMatchingApplications')}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
              {t('applications:noMatchingSubtitle')}
            </p>
            <Button variant="outline" onClick={handleClearFilter} className="cursor-pointer">
              {t('applications:clearFilter')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Application cards */}
      {!isFetchingMyApplications && !fetchMyApplicationsError && myApplications.length > 0 && (
        <div className="space-y-4">
          {myApplications.map((application: ApplicationItem) => (
            <ApplicationCard
              key={application.id}
              application={application}
              language={language}
              searchTerm={searchTerm}
              onWithdraw={handleOpenWithdraw}
            />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {!isFetchingMyApplications &&
        myApplicationsPagination &&
        myApplicationsPagination.total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-200 dark:border-slate-800">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {isRTL ? (
                <span>
                  عرض {myApplicationsPagination.from || 1} إلى{' '}
                  {myApplicationsPagination.to || myApplications.length} من أصل{' '}
                  {myApplicationsPagination.total} طلب
                </span>
              ) : (
                <span>
                  Showing {myApplicationsPagination.from || 1} to{' '}
                  {myApplicationsPagination.to || myApplications.length} of{' '}
                  {myApplicationsPagination.total} applications
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1 || isFetchingMyApplications}
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
                {Array.from({ length: myApplicationsPagination.last_page }, (_, i) => i + 1)
                  .filter((p) => {
                    return (
                      p === 1 ||
                      p === myApplicationsPagination.last_page ||
                      Math.abs(p - currentPage) <= 1
                    );
                  })
                  .map((pageNum, idx, arr) => {
                    const prevPage = arr[idx - 1];
                    const showEllipsis = prevPage && pageNum - prevPage > 1;

                    return (
                      <React.Fragment key={pageNum}>
                        {showEllipsis && <span className="px-1.5 text-xs text-gray-400">...</span>}
                        <Button
                          variant={pageNum === currentPage ? 'default' : 'outline'}
                          size="sm"
                          disabled={isFetchingMyApplications}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`h-8 w-8 p-0 text-xs cursor-pointer ${
                            pageNum === currentPage
                              ? 'bg-university-primary hover:bg-university-secondary text-white'
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
                  currentPage >= myApplicationsPagination.last_page || isFetchingMyApplications
                }
                onClick={() =>
                  setCurrentPage((prev) => Math.min(myApplicationsPagination.last_page, prev + 1))
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

      {/* Withdraw confirmation dialog (TEP-641) */}
      <WithdrawApplicationDialog
        isOpen={withdrawTarget !== null}
        onClose={handleCloseWithdraw}
        application={withdrawTarget}
      />
    </div>
  );
};

export default MyApplicationsPage;
