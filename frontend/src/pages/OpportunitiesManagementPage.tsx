import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useAppDispatch, useAppSelector } from '@/store';
import { usePermissions } from '@/hooks/usePermissions';
import { fetchOpportunityTypes } from '@/store/slices/lookupSlice';
import { fetchOpportunities, transitionOpportunity } from '@/store/slices/opportunitySlice';
import { fetchCompanyProfile } from '@/store/slices/companySlice';
import { useToast } from '@/context/ToastContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CreateOpportunityDialog } from '@/components/opportunities/CreateOpportunityDialog';
import { EditOpportunityDialog } from '@/components/opportunities/EditOpportunityDialog';
import {
  Plus,
  MapPin,
  Calendar,
  Clock,
  Users,
  Eye,
  Search,
  Filter,
  Briefcase,
  Loader2,
  Edit,
  Archive,
  CheckCircle,
  XCircle,
  ArchiveRestore,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import type { OpportunityItem } from '@/types/opportunity';
import HighlightText from '@/components/ui/HighlightText';

export const OpportunitiesManagementPage: React.FC = () => {
  const { t, i18n } = useTranslation(['opportunities', 'common']);
  const isRTL = i18n.language === 'ar';
  const navigate = useNavigate();

  const dispatch = useAppDispatch();
  const toast = useToast();
  const { can } = usePermissions();

  const canCreateOpportunity = can('opportunities.own.create');
  const canUpdateOpportunity = can('opportunities.own.update');
  const canPublishOpportunity = can('opportunities.own.publish');
  const canCloseOpportunity = can('opportunities.own.close');
  const canArchiveOpportunity = can('opportunities.own.archive');

  const {
    opportunities: reduxOpportunities,
    isLoading,
    error,
    isTransitioning,
  } = useAppSelector((state) => state.opportunity);
  const { opportunityTypes } = useAppSelector((state) => state.lookup);
  const { company } = useAppSelector((state) => state.company);

  const isSuspended = company?.status === 'suspended';

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<OpportunityItem | null>(null);

  // Transition confirmation dialog state
  const [transitionTarget, setTransitionTarget] = useState<{
    opportunity: OpportunityItem;
    to_status: 'published' | 'closed' | 'archived';
  } | null>(null);
  const [isTransitionConfirmOpen, setIsTransitionConfirmOpen] = useState(false);
  const [transitioningId, setTransitioningId] = useState<number | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const { pagination } = useAppSelector((state) => state.opportunity);

  const hasActiveFilters = searchTerm !== '' || statusFilter !== 'all' || typeFilter !== 'all';

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    setCurrentPage(1);
  };

  const handleTypeChange = (val: string) => {
    setTypeFilter(val);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setTypeFilter('all');
    setCurrentPage(1);
  };

  useEffect(() => {
    document.title = `${t('title')} | ${t('common:pageTitleSuffix', 'منصة التدريب التعاوني')}`;
  }, [t, i18n.language]);

  useEffect(() => {
    const params: Record<string, string | number> = { page: currentPage };
    if (searchTerm.trim()) params.q = searchTerm.trim();
    if (statusFilter !== 'all') params.status = statusFilter;
    if (typeFilter !== 'all') params.opportunity_type_id = Number(typeFilter);
    dispatch(fetchOpportunities(params));
  }, [dispatch, currentPage, searchTerm, statusFilter, typeFilter]);

  useEffect(() => {
    if (!company) {
      dispatch(fetchCompanyProfile());
    }
  }, [dispatch, company]);

  useEffect(() => {
    if (opportunityTypes.length === 0) {
      dispatch(fetchOpportunityTypes());
    }
  }, [dispatch, opportunityTypes.length]);

  const getLocalized = useCallback(
    (field: unknown): string => {
      if (typeof field === 'string') return field;
      if (typeof field === 'object' && field !== null) {
        const loc = field as Record<string, string>;
        return isRTL ? loc.ar || loc.en || '' : loc.en || loc.ar || '';
      }
      return '';
    },
    [isRTL]
  );

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string }> = {
      draft: {
        color: 'bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-gray-300 border-gray-300',
        label: t('status.draft'),
      },
      published: {
        color:
          'bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300 border-green-300',
        label: t('status.published'),
      },
      closed: {
        color: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border-red-300',
        label: t('status.closed'),
      },
      completed: {
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300',
        label: t('status.completed', 'مكتمل'),
      },
      archived: {
        color:
          'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300',
        label: t('status.archived', 'مؤرشف'),
      },
    };

    const config = statusConfig[status] || statusConfig.draft;
    return (
      <Badge variant="outline" className={`${config.color} border font-medium`}>
        {config.label}
      </Badge>
    );
  };

  const getOpportunityTypeLabel = useCallback(
    (typeId: number): string => {
      const found = opportunityTypes.find((ot) => ot.id === typeId);
      if (!found) return '';
      if (typeof found.name === 'string') return found.name;
      return isRTL ? found.name.ar || found.name.en || '' : found.name.en || found.name.ar || '';
    },
    [opportunityTypes, isRTL]
  );

  const getWorkModeBadge = useCallback(
    (mode?: string) => {
      const normalized = mode || 'full_time';
      const config: Record<
        string,
        { labelAr: string; labelEn: string; variant: 'outline' | 'secondary' }
      > = {
        full_time: { labelAr: 'دوام كامل', labelEn: 'Full Time', variant: 'outline' },
        part_time: { labelAr: 'دوام جزئي', labelEn: 'Part Time', variant: 'outline' },
        remote: { labelAr: 'عن بُعد', labelEn: 'Remote', variant: 'secondary' },
        hybrid: { labelAr: 'مختلط', labelEn: 'Hybrid', variant: 'outline' },
      };
      const item = config[normalized] || config.full_time;
      return (
        <Badge variant={item.variant} className="text-xs font-medium">
          {isRTL ? item.labelAr : item.labelEn}
        </Badge>
      );
    },
    [isRTL]
  );

  const openTransitionConfirm = (
    opp: OpportunityItem,
    to_status: 'published' | 'closed' | 'archived'
  ) => {
    setTransitionTarget({ opportunity: opp, to_status });
    setIsTransitionConfirmOpen(true);
  };

  const handleExecuteTransition = async () => {
    if (!transitionTarget) return;

    const { opportunity, to_status } = transitionTarget;
    setTransitioningId(opportunity.id);

    const result = await dispatch(
      transitionOpportunity({
        id: opportunity.id,
        payload: {
          to_status,
          version: opportunity.version,
        },
      })
    );

    setTransitioningId(null);
    setIsTransitionConfirmOpen(false);
    setTransitionTarget(null);

    if (transitionOpportunity.fulfilled.match(result)) {
      if (to_status === 'published') {
        toast.success(t('publishedSuccessMessage', 'Opportunity published successfully!'));
      } else if (to_status === 'closed') {
        toast.success(t('closedSuccessMessage', 'Opportunity closed successfully!'));
      } else if (to_status === 'archived') {
        toast.success(t('archivedSuccessMessage', 'Opportunity archived successfully!'));
      }
    } else if (transitionOpportunity.rejected.match(result)) {
      const errCode = result.payload?.error_code;
      if (errCode === 'version_mismatch') {
        toast.error(
          t(
            'versionMismatchDesc',
            'This opportunity was changed by someone else. Please reload before saving again.'
          )
        );
        dispatch(fetchOpportunities({ page: currentPage }));
      } else {
        toast.error(result.payload?.message || t('common:error', 'An error occurred'));
      }
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6 pb-12">
      {/* Suspension Banner */}
      {isSuspended && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700/60 px-4 py-3.5">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              {t('suspension.title', { defaultValue: 'Account Suspended' })}
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              {t('suspension.opportunitiesDesc', {
                defaultValue:
                  'Your company account is currently suspended. You cannot create or publish opportunities. You may still archive or close existing ones.',
              })}
            </p>
            {company?.status_reason && (
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 font-medium">
                {t('suspension.reason', { defaultValue: 'Reason' })}: {company.status_reason}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <Briefcase className="h-7 w-7 text-university-primary" />
            {t('title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('subtitle')}</p>
        </div>

        {canCreateOpportunity && (
          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            disabled={isSuspended}
            title={
              isSuspended
                ? t('suspension.createDisabled', {
                    defaultValue: 'Cannot create opportunities while suspended',
                  })
                : undefined
            }
            className="bg-university-primary hover:bg-university-secondary text-white cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2" />
            {t('createOpportunity')}
          </Button>
        )}
      </div>

      {/* Filters Bar */}
      <Card className="border-gray-200 dark:border-slate-800 shadow-xs">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search
                className={`absolute top-2.5 ${isRTL ? 'right-3' : 'left-3'} h-4 w-4 text-gray-400`}
              />
              <Input
                placeholder={t('search')}
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className={isRTL ? 'pr-9' : 'pl-9'}
              />
            </div>

            <div className="flex flex-wrap sm:flex-nowrap gap-3">
              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-40 cursor-pointer">
                  <SelectValue placeholder={t('filterStatus')}>
                    {statusFilter === 'all'
                      ? t('all')
                      : statusFilter === 'draft'
                        ? t('status.draft')
                        : statusFilter === 'published'
                          ? t('status.published')
                          : statusFilter === 'closed'
                            ? t('status.closed')
                            : statusFilter === 'completed'
                              ? t('status.completed')
                              : statusFilter === 'archived'
                                ? t('status.archived')
                                : t('all')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="cursor-pointer">
                    {t('all')}
                  </SelectItem>
                  <SelectItem value="draft" className="cursor-pointer">
                    {t('status.draft')}
                  </SelectItem>
                  <SelectItem value="published" className="cursor-pointer">
                    {t('status.published')}
                  </SelectItem>
                  <SelectItem value="closed" className="cursor-pointer">
                    {t('status.closed')}
                  </SelectItem>
                  <SelectItem value="archived" className="cursor-pointer">
                    {t('status.archived')}
                  </SelectItem>
                  <SelectItem value="completed" className="cursor-pointer">
                    {t('status.completed')}
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Opportunity Type Filter */}
              <Select value={typeFilter} onValueChange={handleTypeChange}>
                <SelectTrigger className="w-45 cursor-pointer">
                  <SelectValue placeholder={t('filterType')}>
                    {typeFilter === 'all'
                      ? t('allTypes')
                      : (() => {
                          const found = opportunityTypes.find((ot) => String(ot.id) === typeFilter);
                          if (!found) return t('allTypes');
                          const name = found.name;
                          if (typeof name === 'string') return name;
                          return isRTL ? name.ar || name.en || '' : name.en || name.ar || '';
                        })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="cursor-pointer">
                    {t('allTypes')}
                  </SelectItem>
                  {opportunityTypes.map((ot) => {
                    const label =
                      typeof ot.name === 'string'
                        ? ot.name
                        : isRTL
                          ? ot.name.ar || ot.name.en || ''
                          : ot.name.en || ot.name.ar || '';
                    return (
                      <SelectItem key={ot.id} value={String(ot.id)} className="cursor-pointer">
                        {label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <div className="flex justify-end pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-xs text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white cursor-pointer"
              >
                <Filter className="h-3.5 w-3.5 me-1.5" />
                {isRTL ? 'مسح الفلاتر' : 'Clear Filters'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Opportunities List */}
      <div className="space-y-4">
        {isLoading ? (
          <Card className="border-gray-200 dark:border-slate-800">
            <CardContent className="p-12 text-center">
              <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-university-primary" />
                <p className="text-sm">{t('common:loading', 'Loading...')}</p>
              </div>
            </CardContent>
          </Card>
        ) : error ? (
          <Card className="border-red-200 dark:border-red-900">
            <CardContent className="p-12 text-center">
              <div className="flex flex-col items-center justify-center text-red-500 gap-3">
                <p className="text-sm font-medium">{error}</p>
              </div>
            </CardContent>
          </Card>
        ) : reduxOpportunities.length === 0 ? (
          <Card className="border-dashed border-2 border-gray-200 dark:border-slate-800">
            <CardContent className="p-12 text-center">
              <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                <div className="p-4 rounded-full bg-gray-100 dark:bg-slate-800 mb-4">
                  <Filter className="h-8 w-8 text-gray-400 opacity-60" />
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  {t('noOpportunities')}
                </h3>
                {canCreateOpportunity && (
                  <Button
                    onClick={() => setIsCreateDialogOpen(true)}
                    variant="outline"
                    className="mt-4 cursor-pointer"
                  >
                    <Plus className="h-4 w-4 mr-2 rtl:mr-0 rtl:ml-2" />
                    {t('createOpportunity')}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          reduxOpportunities.map((opportunity) => {
            const isExpired =
              opportunity.status === 'published' && opportunity.application_open === false;

            return (
              <Card
                key={opportunity.id}
                className="hover:shadow-md transition-all duration-200 border-gray-200 dark:border-slate-800 dark:bg-slate-900"
              >
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="space-y-3 flex-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                          <HighlightText
                            text={getLocalized(opportunity.title)}
                            query={searchTerm}
                          />
                        </h3>
                        {getStatusBadge(opportunity.status)}
                        {isExpired && (
                          <Badge
                            variant="outline"
                            className="text-xs border-red-300 text-red-600 dark:border-red-800 dark:text-red-400"
                          >
                            {t(
                              'applicationsClosed',
                              isRTL ? 'انتهى التقديم' : 'Applications closed'
                            )}
                          </Badge>
                        )}
                        {getOpportunityTypeLabel(opportunity.opportunity_type_id) && (
                          <Badge variant="outline" className="text-xs">
                            {getOpportunityTypeLabel(opportunity.opportunity_type_id)}
                          </Badge>
                        )}
                        {getWorkModeBadge(opportunity.work_mode)}
                      </div>

                      {opportunity.department && (
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          <HighlightText
                            text={getLocalized(opportunity.department)}
                            query={searchTerm}
                          />
                        </p>
                      )}

                      <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
                        {opportunity.location && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-gray-400" />
                            <span>{opportunity.location}</span>
                          </div>
                        )}
                        {opportunity.duration && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-gray-400" />
                            <span>{opportunity.duration}</span>
                          </div>
                        )}
                        {opportunity.start_date && (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-gray-400" />
                            <span>{opportunity.start_date}</span>
                          </div>
                        )}
                        {opportunity.application_deadline && (
                          <div
                            className={`flex items-center gap-1.5 ${
                              isExpired ? 'font-medium text-red-500 dark:text-red-400' : ''
                            }`}
                          >
                            <Calendar
                              className={`h-3.5 w-3.5 ${isExpired ? 'text-red-400' : 'text-gray-400'}`}
                            />
                            <span>{opportunity.application_deadline}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-gray-400" />
                          <span>
                            {t('positions')}: {opportunity.capacity}
                          </span>
                        </div>
                      </div>

                      {/* Applied / Accepted counts */}
                      <div className="flex gap-4 text-xs">
                        <span className="text-blue-600 dark:text-blue-400 font-medium">
                          {t('applied', 'Applicants')}:{' '}
                          {opportunity.applicants_count ?? opportunity.applications_count ?? 0}
                        </span>
                        <span className="text-green-600 dark:text-green-400 font-medium">
                          {t('accepted', 'Accepted')}: {opportunity.accepted_count ?? 0}
                        </span>
                      </div>

                      {isExpired && (
                        <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          <span>
                            {t(
                              'deadlinePassedHint',
                              isRTL
                                ? 'انتهى موعد التقديم ولن يتمكن الطلاب من التقديم. يمكنك تمديد الموعد عبر التعديل أو إغلاق الفرصة.'
                                : 'The application deadline has passed — students can no longer apply. Extend the deadline via Edit or close the opportunity.'
                            )}
                          </span>
                        </p>
                      )}

                      <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                        {getLocalized(opportunity.description)}
                      </p>
                    </div>

                    {/* Action buttons: View | Edit | Status Transition (Publish/Close/Archive) */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/opportunities/${opportunity.id}`)}
                        className="cursor-pointer"
                      >
                        <Eye className="h-4 w-4 me-1.5" />
                        {t('viewDetails')}
                      </Button>

                      {/* Edit button — allowed when draft or published (not closed/completed/archived) */}
                      {canUpdateOpportunity &&
                        !['closed', 'completed', 'archived'].includes(opportunity.status) && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="cursor-pointer"
                            onClick={() => {
                              setEditingOpportunity(opportunity);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4 me-1.5" />
                            {t('edit', 'Edit')}
                          </Button>
                        )}

                      {/* Publish Action: draft -> published */}
                      {opportunity.status === 'draft' && canPublishOpportunity && (
                        <Button
                          size="sm"
                          disabled={
                            (isTransitioning && transitioningId === opportunity.id) || isSuspended
                          }
                          title={
                            isSuspended
                              ? t('suspension.publishDisabled', {
                                  defaultValue: 'Cannot publish while suspended',
                                })
                              : undefined
                          }
                          className="cursor-pointer bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => openTransitionConfirm(opportunity, 'published')}
                        >
                          {isTransitioning && transitioningId === opportunity.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 me-1.5" />
                              {t('publish', 'Publish')}
                            </>
                          )}
                        </Button>
                      )}

                      {/* Close Action: published -> closed */}
                      {opportunity.status === 'published' && canCloseOpportunity && (
                        <Button
                          size="sm"
                          disabled={isTransitioning && transitioningId === opportunity.id}
                          className="cursor-pointer bg-red-600 hover:bg-red-700 text-white"
                          onClick={() => openTransitionConfirm(opportunity, 'closed')}
                        >
                          {isTransitioning && transitioningId === opportunity.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <XCircle className="h-4 w-4 me-1.5" />
                              {t('close', 'Close')}
                            </>
                          )}
                        </Button>
                      )}

                      {/* Archive Action: closed -> archived */}
                      {opportunity.status === 'closed' && canArchiveOpportunity && (
                        <Button
                          size="sm"
                          disabled={isTransitioning && transitioningId === opportunity.id}
                          className="cursor-pointer bg-amber-600 hover:bg-amber-700 text-white"
                          onClick={() => openTransitionConfirm(opportunity, 'archived')}
                        >
                          {isTransitioning && transitioningId === opportunity.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Archive className="h-4 w-4 me-1.5" />
                              {t('archive', 'Archive')}
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Pagination Controls */}
      {pagination && pagination.total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-200 dark:border-slate-800">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {isRTL ? (
              <span>
                عرض {pagination.from || 1} إلى {pagination.to || reduxOpportunities.length} من أصل{' '}
                {pagination.total} فرصة
              </span>
            ) : (
              <span>
                Showing {pagination.from || 1} to {pagination.to || reduxOpportunities.length} of{' '}
                {pagination.total} opportunities
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1 || isLoading}
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
              {Array.from({ length: pagination.last_page }, (_, i) => i + 1)
                .filter((p) => {
                  return p === 1 || p === pagination.last_page || Math.abs(p - currentPage) <= 1;
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
                        disabled={isLoading}
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
              disabled={currentPage >= pagination.last_page || isLoading}
              onClick={() => setCurrentPage((prev) => Math.min(pagination.last_page, prev + 1))}
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

      <CreateOpportunityDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={() => {
          setIsCreateDialogOpen(false);
          // Reset to page 1 so the useEffect re-fetches and includes the new opportunity
          setCurrentPage(1);
          setSearchTerm('');
          setStatusFilter('all');
          setTypeFilter('all');
        }}
      />

      {/* Edit Opportunity Dialog */}
      <EditOpportunityDialog
        opportunity={editingOpportunity}
        open={isEditDialogOpen}
        onOpenChange={(isOpen) => {
          setIsEditDialogOpen(isOpen);
          if (!isOpen) setEditingOpportunity(null);
        }}
        onSuccess={() => {
          setIsEditDialogOpen(false);
          setEditingOpportunity(null);
        }}
      />

      {/* Status Transition Confirmation Dialog */}
      <Dialog open={isTransitionConfirmOpen} onOpenChange={setIsTransitionConfirmOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              {transitionTarget?.to_status === 'published' && (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
              {transitionTarget?.to_status === 'closed' && (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              {transitionTarget?.to_status === 'archived' && (
                <ArchiveRestore className="h-5 w-5 text-amber-600" />
              )}
              {transitionTarget?.to_status === 'published'
                ? t('confirmPublishTitle', 'Publish Opportunity')
                : transitionTarget?.to_status === 'closed'
                  ? t('confirmCloseTitle', 'Close Opportunity')
                  : t('confirmArchiveTitle', 'Archive Opportunity')}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 dark:text-gray-300 mt-2">
              {transitionTarget?.to_status === 'published'
                ? t(
                    'confirmPublishDesc',
                    'Are you sure you want to publish this opportunity? Students will immediately be able to view and apply.'
                  )
                : transitionTarget?.to_status === 'closed'
                  ? t(
                      'confirmCloseDesc',
                      'Are you sure you want to close this opportunity? No new applications will be accepted.'
                    )
                  : t(
                      'confirmArchiveDesc',
                      'Are you sure you want to archive this closed opportunity? It will be moved to permanent history.'
                    )}
            </DialogDescription>
          </DialogHeader>

          {transitionTarget && (
            <div className="rounded-md bg-gray-50 dark:bg-slate-800/60 p-3 text-xs space-y-1 my-2">
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {getLocalized(transitionTarget.opportunity.title)}
              </span>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsTransitionConfirmOpen(false)}
              disabled={isTransitioning}
              className="cursor-pointer"
            >
              {t('form.cancel', 'Cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleExecuteTransition}
              disabled={isTransitioning}
              className={`text-white cursor-pointer ${
                transitionTarget?.to_status === 'published'
                  ? 'bg-green-600 hover:bg-green-700'
                  : transitionTarget?.to_status === 'closed'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              {isTransitioning ? (
                <div className="flex items-center gap-1.5">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{t('processing', 'Processing...')}</span>
                </div>
              ) : (
                <span>{t('confirm', 'Confirm')}</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OpportunitiesManagementPage;
