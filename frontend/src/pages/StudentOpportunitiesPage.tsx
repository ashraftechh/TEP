import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useAppDispatch, useAppSelector } from '@/store';
import { fetchMajors, fetchOpportunityTypes } from '@/store/slices/lookupSlice';
import { fetchOpportunities } from '@/store/slices/opportunitySlice';
import { usePermissions } from '@/hooks/usePermissions';
import { ApplyOpportunityDialog } from '@/components/opportunities/ApplyOpportunityDialog';
import type { OpportunityItem } from '@/types/opportunity';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  MapPin,
  Calendar,
  Building2,
  Clock,
  Briefcase,
  Loader2,
  Filter,
  CheckCircle2,
  Globe,
  DollarSign,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  Eye,
  AlertCircle,
} from 'lucide-react';
import HighlightText from '@/components/ui/HighlightText';

export const StudentOpportunitiesPage: React.FC = () => {
  const { t, i18n } = useTranslation(['opportunities', 'common']);
  const isRTL = i18n.language === 'ar';
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { hasRole } = usePermissions();
  const isStudent = hasRole('student');

  const { opportunities, pagination, isLoading, error } = useAppSelector(
    (state) => state.opportunity
  );
  const { majors, opportunityTypes } = useAppSelector((state) => state.lookup);
  const { user } = useAppSelector((state) => state.auth);

  const hasActiveAssignment =
    isStudent &&
    (opportunities.some((o) => o.has_active_assignment) ||
      Boolean(
        (user?.student_profile as Record<string, unknown> | undefined)?.has_active_assignment
      ));

  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [majorFilter, setMajorFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isRemoteFilter, setIsRemoteFilter] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedApplyOpp, setSelectedApplyOpp] = useState<OpportunityItem | null>(null);
  const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false);

  useEffect(() => {
    document.title = `${t('availableOpportunities', 'فرص التدريب المتاحة')} | ${t('common:pageTitleSuffix', 'منصة التدريب التعاوني')}`;
  }, [t, i18n.language]);

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  const handleLocationChange = (val: string) => {
    setLocationFilter(val);
    setCurrentPage(1);
  };

  const handleMajorChange = (val: string) => {
    setMajorFilter(val);
    setCurrentPage(1);
  };

  const handleTypeChange = (val: string) => {
    setTypeFilter(val);
    setCurrentPage(1);
  };

  const handleRemoteToggle = () => {
    setIsRemoteFilter((prev) => !prev);
    setCurrentPage(1);
  };

  // Initial lookup fetch
  useEffect(() => {
    if (majors.length === 0) dispatch(fetchMajors());
    if (opportunityTypes.length === 0) dispatch(fetchOpportunityTypes());
  }, [dispatch, majors.length, opportunityTypes.length]);

  // Fetch opportunities with filters and pagination
  useEffect(() => {
    const params: Record<string, string | number | boolean> = {
      page: currentPage,
    };
    if (searchTerm.trim()) params.q = searchTerm.trim();
    if (locationFilter.trim()) params.location = locationFilter.trim();
    if (majorFilter !== 'all') params.major_id = Number(majorFilter);
    if (typeFilter !== 'all') params.opportunity_type_id = Number(typeFilter);
    if (isRemoteFilter) params.is_remote = 1;

    dispatch(fetchOpportunities(params));
  }, [dispatch, searchTerm, locationFilter, majorFilter, typeFilter, isRemoteFilter, currentPage]);

  const getLocalized = useCallback(
    (field: unknown): string => {
      if (!field) return '';
      if (typeof field === 'string') return field;
      if (typeof field === 'object') {
        const loc = field as Record<string, string>;
        return isRTL ? loc.ar || loc.en || '' : loc.en || loc.ar || '';
      }
      return '';
    },
    [isRTL]
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

  const clearFilters = () => {
    setSearchTerm('');
    setLocationFilter('');
    setMajorFilter('all');
    setTypeFilter('all');
    setIsRemoteFilter(false);
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchTerm !== '' ||
    locationFilter !== '' ||
    majorFilter !== 'all' ||
    typeFilter !== 'all' ||
    isRemoteFilter;

  const handleApplyClick = (opp: OpportunityItem) => {
    setSelectedApplyOpp(opp);
    setIsApplyDialogOpen(true);
  };

  // Helper to get localized major label for filter
  const selectedMajorLabel = useMemo(() => {
    if (majorFilter === 'all') return isRTL ? 'كل التخصصات' : 'All Majors';
    const found = majors.find((m) => String(m.id) === majorFilter || m.code === majorFilter);
    return found ? getLocalized(found.name) : majorFilter;
  }, [majorFilter, majors, isRTL, getLocalized]);

  // Helper to get localized opportunity-type label for filter
  const selectedTypeLabel = useMemo(() => {
    if (typeFilter === 'all') return isRTL ? 'كل الأنواع' : 'All Types';
    const found = opportunityTypes.find((ot) => String(ot.id) === typeFilter);
    return found ? getLocalized(found.name) : typeFilter;
  }, [typeFilter, opportunityTypes, isRTL, getLocalized]);

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6 pb-12" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
          <Briefcase className="h-7 w-7 text-university-primary" />
          {t('availableOpportunities', 'فرص التدريب المتاحة')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {opportunities.length} {t('resultsCount', 'نتيجة')}
        </p>
      </div>

      {/* Active Training Assignment Warning Banner */}
      {hasActiveAssignment && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 shadow-xs">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <div className="space-y-0.5">
            <p className="text-sm font-semibold">
              {t(
                'hasActiveAssignmentBtn',
                isRTL ? 'لديك تدريب تعاوني نشط' : 'Active Training Assignment'
              )}
            </p>
            <p className="text-xs text-amber-800 dark:text-amber-300/90 leading-relaxed">
              {t(
                'hasActiveAssignmentAlert',
                isRTL
                  ? 'لديك تدريب تعاوني نشط حالياً. لا يمكنك التقديم على فرص تدريبية جديدة حتى اكتمال فترة التدريب الحالية.'
                  : 'You currently have an active training assignment in progress. You cannot apply to new opportunities until your current training is completed.'
              )}
            </p>
          </div>
        </div>
      )}

      {/* Search and Filters Bar */}
      <Card className="border-gray-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900">
        <CardContent className="p-4 md:p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Search Input (4 cols) */}
            <div className="md:col-span-4 relative">
              <Search
                className={`absolute top-2.5 ${isRTL ? 'right-3' : 'left-3'} h-4 w-4 text-gray-400`}
              />
              <Input
                placeholder={t('searchOpportunitiesPlaceholder', 'البحث في الفرص أو الشركات...')}
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className={isRTL ? 'pr-9' : 'pl-9'}
              />
            </div>

            {/* Location Free-text Input (3 cols) */}
            <div className="md:col-span-3 relative">
              <MapPin
                className={`absolute top-2.5 ${isRTL ? 'right-3' : 'left-3'} h-4 w-4 text-gray-400`}
              />
              <Input
                placeholder={t('form.location', 'المدينة / الموقع...')}
                value={locationFilter}
                onChange={(e) => handleLocationChange(e.target.value)}
                className={isRTL ? 'pr-9' : 'pl-9'}
              />
            </div>

            {/* Major Select (3 cols) */}
            <div className="md:col-span-3">
              <Select value={majorFilter} onValueChange={handleMajorChange}>
                <SelectTrigger className="cursor-pointer w-full">
                  <SelectValue placeholder={t('major', 'التخصص')}>{selectedMajorLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? 'كل التخصصات' : 'All Majors'}</SelectItem>
                  {majors.map((major) => (
                    <SelectItem key={major.id} value={String(major.id)} className="cursor-pointer">
                      {getLocalized(major.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Opportunity Type Select (2 cols) */}
            <div className="md:col-span-2">
              <Select value={typeFilter} onValueChange={handleTypeChange}>
                <SelectTrigger className="cursor-pointer w-full">
                  <SelectValue placeholder={t('trainingType', 'نوع التدريب')}>
                    {selectedTypeLabel}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{isRTL ? 'كل الأنواع' : 'All Types'}</SelectItem>
                  {opportunityTypes.map((ot) => (
                    <SelectItem key={ot.id} value={String(ot.id)} className="cursor-pointer">
                      {getLocalized(ot.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Filter options bar: Is Remote toggle + Clear Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={isRemoteFilter ? 'default' : 'outline'}
                size="sm"
                onClick={handleRemoteToggle}
                className={`text-xs cursor-pointer ${
                  isRemoteFilter
                    ? 'bg-university-primary hover:bg-university-secondary text-white'
                    : 'text-gray-700 dark:text-gray-200'
                }`}
              >
                <Globe className="h-3.5 w-3.5 me-1.5" />
                {isRTL ? 'عن بُعد فقط' : 'Remote Only'}
              </Button>
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-xs text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white cursor-pointer"
              >
                <Filter className="h-3.5 w-3.5 me-1.5" />
                {isRTL ? 'مسح الفلاتر' : 'Clear Filters'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Opportunities 2-Column Grid */}
      {isLoading ? (
        <Card className="border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <CardContent className="p-12 text-center">
            <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-university-primary" />
              <p className="text-sm">{t('common:loading', 'جاري التحميل...')}</p>
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="border-red-200 dark:border-red-900 bg-white dark:bg-slate-900">
          <CardContent className="p-12 text-center">
            <p className="text-sm font-medium text-red-500">{error}</p>
          </CardContent>
        </Card>
      ) : opportunities.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <CardContent className="p-12 text-center">
            <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
              {t('noOpportunitiesMatch', 'لا توجد نتائج مطابقة')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {t('tryAdjustingFilters', 'حاول تغيير معايير البحث أو الفلاتر')}
            </p>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="cursor-pointer text-xs"
              >
                {t('clearFilters', 'مسح الفلاتر')}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {opportunities.map((opportunity) => {
            const companyName =
              getLocalized(opportunity.company?.name) || t('unnamedCompany', 'جهة التدريب');
            const isApplied = !!(opportunity.already_applied ?? opportunity.applied);
            const isClosed = opportunity.application_open === false;

            return (
              <Card
                key={opportunity.id}
                className="hover:shadow-lg transition-all duration-200 flex flex-col justify-between border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="h-11 w-11 rounded-lg bg-university-primary/10 dark:bg-university-primary/20 flex items-center justify-center text-university-primary shrink-0 text-xl font-bold">
                        {opportunity.company?.logo_url ? (
                          <img
                            src={opportunity.company.logo_url}
                            alt={companyName}
                            className="h-full w-full object-cover rounded-lg"
                          />
                        ) : (
                          <Building2 className="h-6 w-6" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-base md:text-lg font-bold text-gray-900 dark:text-white leading-snug">
                          <HighlightText text={companyName} query={searchTerm} />
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1 text-sm font-medium text-gray-600 dark:text-gray-300">
                          <span>
                            <HighlightText
                              text={getLocalized(opportunity.title)}
                              query={searchTerm}
                            />
                          </span>
                          {opportunity.opportunity_type?.name && (
                            <Badge variant="outline" className="text-[11px] font-normal">
                              {getLocalized(opportunity.opportunity_type.name)}
                            </Badge>
                          )}
                        </CardDescription>
                      </div>
                    </div>

                    <div className="shrink-0">{getWorkModeBadge(opportunity.work_mode)}</div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-0 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    {/* Location, Duration, Deadline */}
                    <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs text-gray-500 dark:text-gray-400 border-y border-gray-100 dark:border-slate-800/80 py-2.5">
                      {opportunity.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-gray-400" />
                          <span>{opportunity.location}</span>
                        </div>
                      )}
                      {opportunity.duration && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-gray-400" />
                          <span>{opportunity.duration}</span>
                        </div>
                      )}
                      {opportunity.application_deadline && (
                        <div
                          className={`flex items-center gap-1 ${
                            isClosed ? 'font-medium text-red-500 dark:text-red-400' : ''
                          }`}
                        >
                          <Calendar
                            className={`h-3.5 w-3.5 ${isClosed ? 'text-red-400' : 'text-gray-400'}`}
                          />
                          <span>{opportunity.application_deadline}</span>
                          {isClosed && (
                            <span className="ms-1">
                              (
                              {t(
                                'applicationsClosed',
                                isRTL ? 'انتهى التقديم' : 'Applications closed'
                              )}
                              )
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-xs md:text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                      {getLocalized(opportunity.description)}
                    </p>

                    {/* Requirements / Skills Badges */}
                    {opportunity.requirements && opportunity.requirements.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                          {t('requirements', 'المتطلبات')}:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {opportunity.requirements.map((req, idx) => (
                            <Badge
                              key={idx}
                              variant="secondary"
                              className="text-[11px] font-normal px-2 py-0.5"
                            >
                              {getLocalized(req.requirement_text)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Majors Badges */}
                    {opportunity.majors && opportunity.majors.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {opportunity.majors.map((major) => (
                          <Badge
                            key={major.id}
                            variant="outline"
                            className="text-[11px] text-gray-600 dark:text-gray-400 font-normal"
                          >
                            <GraduationCap className="h-3 w-3 me-1" />
                            {getLocalized(major.name)}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Salary */}
                    {opportunity.salary && (
                      <div className="text-sm font-bold text-university-primary flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        <span>{opportunity.salary}</span>
                        <span className="text-xs font-normal text-gray-500">
                          {t('sarMonthly', isRTL ? 'شهرياً' : '/ month')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/opportunities/${opportunity.id}`)}
                      className="cursor-pointer text-xs flex items-center gap-1"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>{isRTL ? 'عرض التفاصيل' : 'View Details'}</span>
                    </Button>

                    {/* Student role apply button */}
                    {isStudent && (
                      <Button
                        disabled={isApplied || hasActiveAssignment || isClosed}
                        onClick={() => handleApplyClick(opportunity)}
                        className={`flex-1 cursor-pointer text-xs font-semibold transition-all ${
                          isApplied || isClosed
                            ? 'bg-gray-400 hover:bg-gray-400 text-white cursor-not-allowed'
                            : hasActiveAssignment
                              ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 cursor-not-allowed opacity-90'
                              : 'bg-university-primary hover:bg-university-secondary text-white shadow-sm'
                        }`}
                      >
                        {isApplied ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 me-1.5" />
                            {t('alreadyApplied', isRTL ? 'تم التقديم' : 'Applied')}
                          </>
                        ) : isClosed ? (
                          <>
                            <Clock className="h-4 w-4 me-1.5" />
                            {t(
                              'applicationsClosed',
                              isRTL ? 'انتهى التقديم' : 'Applications closed'
                            )}
                          </>
                        ) : hasActiveAssignment ? (
                          <>
                            <AlertCircle className="h-4 w-4 me-1.5 text-amber-600 dark:text-amber-400" />
                            {t(
                              'hasActiveAssignmentBtn',
                              isRTL ? 'لديك تدريب نشط' : 'Active Assignment'
                            )}
                          </>
                        ) : (
                          <>
                            <Briefcase className="h-4 w-4 me-1.5" />
                            {t('applyNow', isRTL ? 'التقديم' : 'Apply')}
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination && pagination.total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-200 dark:border-slate-800">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {isRTL ? (
              <span>
                عرض {pagination.from || 1} إلى {pagination.to || opportunities.length} من أصل{' '}
                {pagination.total} فرصة
              </span>
            ) : (
              <span>
                Showing {pagination.from || 1} to {pagination.to || opportunities.length} of{' '}
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
                  // Show current, first, last, and immediate neighbours
                  return p === 1 || p === pagination.last_page || Math.abs(p - currentPage) <= 1;
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
                        disabled={isLoading}
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

      {/* Apply Opportunity Modal Dialog */}
      <ApplyOpportunityDialog
        isOpen={isApplyDialogOpen}
        onClose={() => {
          setIsApplyDialogOpen(false);
          setSelectedApplyOpp(null);
        }}
        opportunity={selectedApplyOpp}
      />
    </div>
  );
};

export default StudentOpportunitiesPage;
