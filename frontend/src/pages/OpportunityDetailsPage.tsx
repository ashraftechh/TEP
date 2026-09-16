import React, { useEffect, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, Link } from 'react-router';
import { useAppDispatch, useAppSelector } from '@/store';
import { usePermissions } from '@/hooks/usePermissions';
import { fetchOpportunityById } from '@/store/slices/opportunitySlice';
import { ApplyOpportunityDialog } from '@/components/opportunities/ApplyOpportunityDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  MapPin,
  Calendar,
  Clock,
  Briefcase,
  Loader2,
  CheckCircle2,
  DollarSign,
  GraduationCap,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Users,
  Award,
  CheckCircle,
} from 'lucide-react';

export const OpportunityDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { t, i18n } = useTranslation(['opportunities', 'common']);
  const isRTL = i18n.language === 'ar';

  const { hasRole } = usePermissions();
  const isStudent = hasRole('student');
  const isCompanyRep = hasRole('company_representative');

  const { selectedOpportunity, isLoading, error } = useAppSelector((state) => state.opportunity);
  const { user } = useAppSelector((state) => state.auth);
  const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false);

  useEffect(() => {
    if (id && selectedOpportunity?.id !== Number(id) && !error) {
      dispatch(fetchOpportunityById(Number(id)));
    }
  }, [dispatch, id, selectedOpportunity?.id, error]);

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

  useEffect(() => {
    if (selectedOpportunity) {
      const title = getLocalized(selectedOpportunity.title);
      document.title = `${title || t('details.title', 'تفاصيل الفرصة')} | ${t('common:pageTitleSuffix', 'منصة التدريب التعاوني')}`;
    }
  }, [selectedOpportunity, t, getLocalized]);

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

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    const statusConfig: Record<string, { color: string; label: string }> = {
      draft: {
        color: 'bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-gray-300 border-gray-300',
        label: t('status.draft', isRTL ? 'مسودة' : 'Draft'),
      },
      published: {
        color:
          'bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300 border-green-300',
        label: t('status.published', isRTL ? 'منشور' : 'Published'),
      },
      closed: {
        color: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border-red-300',
        label: t('status.closed', isRTL ? 'مغلق' : 'Closed'),
      },
      completed: {
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300',
        label: t('status.completed', isRTL ? 'مكتمل' : 'Completed'),
      },
      archived: {
        color:
          'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300',
        label: t('status.archived', isRTL ? 'مؤرشف' : 'Archived'),
      },
    };

    const config = statusConfig[status] || statusConfig.draft;
    return (
      <Badge variant="outline" className={`${config.color} border font-medium text-xs`}>
        {config.label}
      </Badge>
    );
  };

  const handleApplyClick = () => {
    if (selectedOpportunity) {
      setIsApplyDialogOpen(true);
    }
  };

  const isCurrentOpportunityLoaded =
    selectedOpportunity !== null && selectedOpportunity.id === Number(id);

  if (isLoading || (!isCurrentOpportunityLoaded && !error)) {
    return (
      <div className="p-6 lg:p-8 max-w-5xl mx-auto flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-university-primary" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('common:loading', isRTL ? 'جاري التحميل...' : 'Loading...')}
        </p>
      </div>
    );
  }

  if (error || !selectedOpportunity) {
    return (
      <div className="p-6 lg:p-8 max-w-5xl mx-auto" dir={isRTL ? 'rtl' : 'ltr'}>
        <Card className="border-red-200 dark:border-red-900/60 shadow-sm bg-white dark:bg-slate-900">
          <CardContent className="p-12 text-center flex flex-col items-center justify-center gap-4">
            <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center text-red-600 dark:text-red-400">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('details.notFoundTitle', isRTL ? 'الفرصة غير متوفرة' : 'Opportunity Not Found')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-md">
                {t(
                  'details.notFoundDesc',
                  isRTL
                    ? 'عذراً، الفرصة التدريبية المطلوبة غير موجودة أو لم تعد متاحة للعرض.'
                    : 'Sorry, the requested training opportunity does not exist or is no longer available.'
                )}
              </p>
            </div>
            <Button
              onClick={() => navigate('/opportunities')}
              variant="outline"
              className="mt-2 cursor-pointer flex items-center gap-1.5"
            >
              {isRTL ? (
                <>
                  <ArrowRight className="h-4 w-4" />
                  <span>{t('details.backToOpportunities', 'العودة إلى قائمة الفرص')}</span>
                </>
              ) : (
                <>
                  <ArrowLeft className="h-4 w-4" />
                  <span>{t('details.backToOpportunities', 'Back to Opportunities')}</span>
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isApplied = !!(selectedOpportunity.already_applied ?? selectedOpportunity.applied);
  const isClosed = selectedOpportunity.application_open === false;
  const hasActiveAssignment =
    isStudent &&
    (Boolean(selectedOpportunity.has_active_assignment) ||
      Boolean(
        (user?.student_profile as Record<string, unknown> | undefined)?.has_active_assignment
      ));
  const companyName =
    getLocalized(selectedOpportunity.company?.name) || t('unnamedCompany', 'جهة التدريب');

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6 pb-16" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Back Navigation Bar */}
      <div>
        <Link
          to="/opportunities"
          className="inline-flex items-center gap-1.5 text-xs md:text-sm font-medium text-gray-500 hover:text-university-primary dark:text-gray-400 dark:hover:text-university-primary transition-colors cursor-pointer"
        >
          {isRTL ? (
            <>
              <ArrowRight className="h-4 w-4" />
              <span>العودة إلى قائمة الفرص</span>
            </>
          ) : (
            <>
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Opportunities</span>
            </>
          )}
        </Link>
      </div>

      {/* Hero Header Card */}
      <Card className="border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <CardHeader className="p-6 md:p-8 border-b border-gray-100 dark:border-slate-800">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 md:h-20 md:w-20 rounded-xl bg-university-primary/10 dark:bg-university-primary/20 flex items-center justify-center text-university-primary shrink-0 text-2xl font-bold border border-university-primary/20">
                {selectedOpportunity.company?.logo_url ? (
                  <img
                    src={selectedOpportunity.company.logo_url}
                    alt={companyName}
                    className="h-full w-full object-cover rounded-xl"
                  />
                ) : (
                  <Building2 className="h-9 w-9 text-university-primary" />
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
                    {getLocalized(selectedOpportunity.title)}
                  </h1>
                  {!isStudent && getStatusBadge(selectedOpportunity.status)}
                </div>

                <div className="flex items-center gap-2 text-sm md:text-base font-semibold text-university-primary">
                  <span>{companyName}</span>
                </div>

                {selectedOpportunity.department && (
                  <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                    {getLocalized(selectedOpportunity.department)}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2 pt-2">
                  {selectedOpportunity.opportunity_type?.name && (
                    <Badge variant="outline" className="text-xs font-medium">
                      {getLocalized(selectedOpportunity.opportunity_type.name)}
                    </Badge>
                  )}
                  {getWorkModeBadge(selectedOpportunity.work_mode)}
                </div>
              </div>
            </div>

            {/* Main Action on Desktop Header */}
            <div className="shrink-0 flex items-center gap-2">
              {isStudent && (
                <Button
                  size="lg"
                  disabled={isApplied || isClosed}
                  onClick={handleApplyClick}
                  className={`cursor-pointer font-semibold shadow-sm text-sm px-6 inline-flex items-center gap-2 ${
                    isApplied || isClosed
                      ? 'bg-gray-400 hover:bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-university-primary hover:bg-university-secondary text-white'
                  }`}
                >
                  {isApplied ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>{t('details.alreadyApplied', isRTL ? 'تم التقديم' : 'Applied')}</span>
                    </>
                  ) : isClosed ? (
                    <>
                      <Clock className="h-4 w-4" />
                      <span>
                        {t('applicationsClosed', isRTL ? 'انتهى التقديم' : 'Applications closed')}
                      </span>
                    </>
                  ) : (
                    <>
                      <Briefcase className="h-4 w-4" />
                      <span>{t('details.applyNow', isRTL ? 'التقديم الآن' : 'Apply Now')}</span>
                    </>
                  )}
                </Button>
              )}

              {isCompanyRep && (
                <Button
                  variant="outline"
                  onClick={() => navigate('/opportunities')}
                  className="cursor-pointer text-sm"
                >
                  {isRTL ? 'إدارة الفرص' : 'Manage Opportunities'}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        {/* Key Info Metadata Grid */}
        <CardContent className="p-6 md:p-8 bg-gray-50/50 dark:bg-slate-950/40">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {selectedOpportunity.location && (
              <div className="space-y-1">
                <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {t('details.location', isRTL ? 'الموقع' : 'Location')}
                </span>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {selectedOpportunity.location}
                </p>
              </div>
            )}

            {selectedOpportunity.duration && (
              <div className="space-y-1">
                <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {t('details.duration', isRTL ? 'المدة' : 'Duration')}
                </span>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {selectedOpportunity.duration}
                </p>
              </div>
            )}

            {selectedOpportunity.salary !== undefined && selectedOpportunity.salary !== null && (
              <div className="space-y-1">
                <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5" />
                  {t('details.salary', isRTL ? 'المكافأة الشهرية' : 'Monthly Stipend')}
                </span>
                <p className="text-sm font-semibold text-university-primary">
                  {selectedOpportunity.salary > 0
                    ? `${selectedOpportunity.salary} ${isRTL ? 'شهرياً' : '/ month'}`
                    : t('details.unpaid', isRTL ? 'تدريب غير مدفوع' : 'Unpaid Training')}
                </p>
              </div>
            )}

            {selectedOpportunity.capacity && (
              <div className="space-y-1">
                <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {t('details.capacity', isRTL ? 'المقاعد المتاحة' : 'Available Seats')}
                </span>
                <p
                  className="text-sm font-semibold text-gray-900 dark:text-white"
                  dir={isRTL ? 'rtl' : 'ltr'}
                >
                  {selectedOpportunity.capacity} {t('seats', isRTL ? 'مقاعد' : 'seats')}
                </p>
              </div>
            )}

            {selectedOpportunity.start_date && (
              <div className="space-y-1">
                <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {t('details.startDate', isRTL ? 'تاريخ البدء' : 'Start Date')}
                </span>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {selectedOpportunity.start_date}
                </p>
              </div>
            )}

            {selectedOpportunity.end_date && (
              <div className="space-y-1">
                <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {t('details.endDate', isRTL ? 'تاريخ الانتهاء' : 'End Date')}
                </span>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {selectedOpportunity.end_date}
                </p>
              </div>
            )}

            {selectedOpportunity.application_deadline && (
              <div className="space-y-1">
                <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Calendar
                    className={`h-3.5 w-3.5 ${isClosed ? 'text-red-500' : 'text-amber-500'}`}
                  />
                  {t('details.deadline', isRTL ? 'آخر موعد للتقديم' : 'Application Deadline')}
                </span>
                <p
                  className={`text-sm font-semibold ${
                    isClosed
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {selectedOpportunity.application_deadline}
                  {isClosed && (
                    <span className="ms-2 text-xs font-medium">
                      ({t('applicationsClosed', isRTL ? 'انتهى التقديم' : 'Applications closed')})
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Details */}
      <div className="space-y-6">
        {/* Description */}
        <Card className="border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-university-primary" />
              {t('details.description', 'وصف الفرصة التدريبية')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm md:text-base text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
              {getLocalized(selectedOpportunity.description)}
            </div>
          </CardContent>
        </Card>

        {/* Requirements and Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Requirements */}
          {selectedOpportunity.requirements && selectedOpportunity.requirements.length > 0 && (
            <Card className="border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base md:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-university-primary" />
                  {t('details.requirements', 'متطلبات التقديم')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5">
                  {selectedOpportunity.requirements.map((req, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-university-primary/10 text-university-primary text-xs font-bold mt-0.5">
                        {req.sort_order || idx + 1}
                      </span>
                      <span>{getLocalized(req.requirement_text)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Benefits */}
          {selectedOpportunity.benefits && selectedOpportunity.benefits.length > 0 && (
            <Card className="border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base md:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-500" />
                  {t('details.benefits', 'المزايا والمكافآت')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5">
                  {selectedOpportunity.benefits.map((b, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-gray-300"
                    >
                      <Sparkles className="h-4 w-4 text-amber-500 shrink-0 mt-1" />
                      <span>{getLocalized(b.benefit_text)}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Majors and Skills Badges */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Target Majors */}
          {selectedOpportunity.majors && selectedOpportunity.majors.length > 0 && (
            <Card className="border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base md:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-university-primary" />
                  {t('details.majors', 'التخصصات المستهدفة')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {selectedOpportunity.majors.map((major) => (
                    <Badge
                      key={major.id}
                      variant="secondary"
                      className="px-3 py-1 text-xs md:text-sm font-normal"
                    >
                      <GraduationCap className="h-3.5 w-3.5 me-1.5" />
                      {getLocalized(major.name)}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Required Skills */}
          {selectedOpportunity.skills && selectedOpportunity.skills.length > 0 && (
            <Card className="border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base md:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  {t('details.skills', 'المهارات المطلوبة')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {selectedOpportunity.skills.map((skill) => (
                    <Badge
                      key={skill.id}
                      variant="outline"
                      className="px-3 py-1 text-xs md:text-sm font-medium"
                    >
                      <Sparkles className="h-3.5 w-3.5 me-1.5 text-amber-500" />
                      {getLocalized(skill.name)}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Bottom Action Footer for Students */}
      {isStudent && (
        <div className="flex flex-col sm:flex-row items-end sm:items-center justify-between gap-3 pt-4 border-t border-gray-200 dark:border-slate-800">
          {hasActiveAssignment && !isApplied && (
            <p className="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1.5 font-medium">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                {t(
                  'hasActiveAssignmentAlert',
                  isRTL
                    ? 'لديك تدريب تعاوني نشط حالياً ولا يمكنك التقديم.'
                    : 'You currently have an active training assignment and cannot apply.'
                )}
              </span>
            </p>
          )}
          <Button
            size="lg"
            disabled={isApplied || hasActiveAssignment || isClosed}
            onClick={handleApplyClick}
            className={`cursor-pointer font-semibold shadow-sm text-sm px-8 inline-flex items-center gap-2 ${
              isApplied || isClosed
                ? 'bg-gray-400 hover:bg-gray-400 text-white cursor-not-allowed'
                : hasActiveAssignment
                  ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 cursor-not-allowed opacity-90'
                  : 'bg-university-primary hover:bg-university-secondary text-white'
            }`}
          >
            {isApplied ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>{t('details.alreadyApplied', isRTL ? 'تم التقديم' : 'Applied')}</span>
              </>
            ) : isClosed ? (
              <>
                <Clock className="h-4 w-4" />
                <span>
                  {t('applicationsClosed', isRTL ? 'انتهى التقديم' : 'Applications closed')}
                </span>
              </>
            ) : hasActiveAssignment ? (
              <>
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span>
                  {t('hasActiveAssignmentBtn', isRTL ? 'لديك تدريب نشط' : 'Active Assignment')}
                </span>
              </>
            ) : (
              <>
                <Briefcase className="h-4 w-4" />
                <span>{t('details.applyNow', isRTL ? 'التقديم الآن' : 'Apply Now')}</span>
              </>
            )}
          </Button>
        </div>
      )}

      {/* Apply Opportunity Modal Dialog */}
      <ApplyOpportunityDialog
        isOpen={isApplyDialogOpen}
        onClose={() => setIsApplyDialogOpen(false)}
        opportunity={selectedOpportunity}
      />
    </div>
  );
};

export default OpportunityDetailsPage;
