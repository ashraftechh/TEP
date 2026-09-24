import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { reviewReportSchema, type ReviewReportFormValues } from '@/lib/validations/reports';
import { useAppDispatch, useAppSelector } from '@/store';
import { fetchReportTypes } from '@/store/slices/lookupSlice';
import {
  fetchReports,
  reviewReport,
  fetchReportReviews,
  clearReportErrors,
} from '@/store/slices/reportSlice';
import type {
  ReportItem,
  ReportStatus,
  ReviewReportPayload,
  ReportTypeItem,
} from '@/types/reports';
import { useToast } from '@/context/ToastContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Eye,
  Paperclip,
  Search,
  ExternalLink,
  History,
  AlertTriangle,
  Loader2,
  GraduationCap,
  Calendar,
  Building2,
  Briefcase,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import HighlightText from '@/components/ui/HighlightText';

const EMPTY_REPORT_TYPES: ReportTypeItem[] = [];

export const SupervisorReportsPage: React.FC = () => {
  const { t, i18n } = useTranslation(['reports', 'common']);
  const isRTL = i18n.language === 'ar';
  const toast = useToast();
  const dispatch = useAppDispatch();

  const {
    reports,
    pagination,
    isLoadingReports,
    isReviewing,
    reviewError,
    reportReviews,
    validationErrors,
  } = useAppSelector((state) => state.reports);
  const reportTypes = useAppSelector((state) => state.lookup?.reportTypes ?? EMPTY_REPORT_TYPES);
  const isLoadingReportTypes = useAppSelector((state) =>
    Boolean(
      state.lookup?.isLoadingReportTypes ??
      (state.lookup as unknown as { isLoading?: boolean } | undefined)?.isLoading
    )
  );

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedOpportunity, setSelectedOpportunity] = useState<string>('all');
  const [selectedAssignment, setSelectedAssignment] = useState<string>('all');
  // Default view is each student's CURRENT placement only (the backend
  // defaults to this); toggling this re-fetches everything, current and
  // historical alike, so a supervisor can look back at a student's past
  // placement(s) — see the training_assignment_id/is_current default
  // scoping in ReportController::index().
  const [includeHistory, setIncludeHistory] = useState(false);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Review Dialog State
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);
  const selectedReport = useMemo(
    () => (selectedReportId ? (reports.find((r) => r.id === selectedReportId) ?? null) : null),
    [reports, selectedReportId]
  );
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);

  // Validation schema & react-hook-form (matching StudentReportsPage pattern)
  const schema = useMemo(() => reviewReportSchema(t), [t]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    clearErrors,
    trigger,
    control,
    formState: { errors, isSubmitted },
  } = useForm<ReviewReportFormValues>({
    resolver: zodResolver(schema) as Resolver<ReviewReportFormValues>,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      decision: '',
      grade: '',
      feedback: '',
    },
  });

  const decision = useWatch({ control, name: 'decision' });

  // Re-trigger validation on language change if form was already submitted
  useEffect(() => {
    if (isSubmitted) {
      trigger();
    }
  }, [i18n.language, isSubmitted, trigger]);

  // Map server-side validation errors to react-hook-form fields
  useEffect(() => {
    if (validationErrors && Object.keys(validationErrors).length > 0) {
      Object.entries(validationErrors).forEach(([field, messages]) => {
        const errorList = messages as string[] | undefined;
        if (errorList && errorList.length > 0) {
          setError(field as keyof ReviewReportFormValues, {
            type: 'server',
            message: errorList[0],
          });
        }
      });
    }
  }, [validationErrors, setError]);

  const getFieldError = (field: keyof ReviewReportFormValues): string | undefined => {
    if (errors[field]?.message) return errors[field]?.message;
    const serverErr = validationErrors?.[field];
    if (serverErr && serverErr.length > 0) {
      return serverErr[0];
    }
    return undefined;
  };

  // Server-side filters: search, type and exact status values are sent as
  // request params and drive real pagination — matching the "pending"
  // pseudo-status (submitted + under_review together) and the
  // company/opportunity/placement filters, which the backend can't
  // express as a single param, stay client-side over whatever page is
  // currently loaded (see filteredReports below — same trade-off
  // TrainingAssignmentsPage already makes for its own company/opportunity
  // filters).
  const isPendingStatus = selectedStatus === 'pending';
  const serverStatus = selectedStatus === 'all' || isPendingStatus ? undefined : selectedStatus;
  const serverTypeId = selectedType === 'all' ? undefined : parseInt(selectedType, 10);

  // Reset to page 1 whenever a server-side filter changes.
  useEffect(() => {
    setCurrentPage(1);
  }, [serverStatus, serverTypeId, includeHistory]);

  useEffect(() => {
    const timer = setTimeout(() => {
      dispatch(
        fetchReports({
          status: serverStatus,
          report_type_id: serverTypeId,
          q: searchQuery.trim() || undefined,
          include_history: includeHistory || undefined,
          page: currentPage,
        })
      );
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, serverStatus, serverTypeId, searchQuery, includeHistory, currentPage]);

  useEffect(() => {
    if (reportTypes.length === 0 && !isLoadingReportTypes) {
      dispatch(fetchReportTypes());
    }
  }, [dispatch, reportTypes.length, isLoadingReportTypes]);

  const formatDate = useCallback(
    (dateString?: string | null) => {
      if (!dateString) return '—';
      try {
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return dateString;
        return d.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      } catch {
        return dateString;
      }
    },
    [isRTL]
  );

  const resolveLocalizedText = useCallback(
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

  const getLocalizedTypeName = useCallback(
    (item: { name?: unknown; code?: string } | undefined | null) => {
      if (!item) return '';
      if (typeof item.name === 'object' && item.name !== null) {
        const loc = item.name as Record<string, string>;
        const val = isRTL ? loc.ar || loc.en : loc.en || loc.ar;
        if (val) return val;
      }
      if (typeof item.name === 'string') {
        try {
          const parsed = JSON.parse(item.name);
          if (typeof parsed === 'object' && parsed !== null) {
            const val = isRTL ? parsed.ar || parsed.en : parsed.en || parsed.ar;
            if (val) return val;
          }
        } catch {
          // not json
        }
      }
      if (item.code) {
        const tr = t(`reportTypes.${item.code}`, { defaultValue: '' });
        if (tr) return tr;
      }
      return typeof item.name === 'string' ? item.name : item.code || '';
    },
    [isRTL, t]
  );

  const formatReportTitle = useCallback(
    (report?: ReportItem | null) => {
      if (!report) return '';
      if (
        report.title?.toLowerCase().includes('weekly') ||
        report.title?.toLowerCase().includes('monthly') ||
        report.title?.toLowerCase().includes('final') ||
        report.title?.includes('تقرير') ||
        report.title?.includes('أسبوع') ||
        report.title?.includes('شهر')
      ) {
        return report.title;
      }
      const code = report.report_type?.code;
      if (code === 'weekly') {
        return t('formattedTitle.weekly', {
          title: report.title,
          number: report.report_number ?? 1,
          defaultValue: isRTL
            ? `${report.title} - الأسبوع ${report.report_number ?? 1}`
            : `${report.title} - Week ${report.report_number ?? 1}`,
        });
      }
      if (code === 'monthly') {
        return t('formattedTitle.monthly', {
          title: report.title,
          number: report.report_number ?? 1,
          defaultValue: isRTL
            ? `${report.title} - الشهر ${report.report_number ?? 1}`
            : `${report.title} - Month ${report.report_number ?? 1}`,
        });
      }
      if (code === 'final') {
        return t('formattedTitle.final', {
          title: report.title,
          defaultValue: isRTL ? `${report.title} - النهائي` : `${report.title} - Final`,
        });
      }
      if (report.report_number) {
        return `${report.title} - #${report.report_number}`;
      }
      return report.title;
    },
    [isRTL, t]
  );

  const getStatusBadge = (status: ReportStatus) => {
    switch (status) {
      case 'approved':
        return (
          <Badge
            variant="outline"
            className="border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300 gap-1.5 font-medium shadow-none rounded-full px-2.5 py-0.5"
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            {t('status.approved', { defaultValue: 'Approved' })}
          </Badge>
        );
      case 'revision_requested':
        return (
          <Badge
            variant="outline"
            className="border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-300 gap-1.5 font-medium shadow-none rounded-full px-2.5 py-0.5"
          >
            <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            {t('status.revision_requested', { defaultValue: 'Revision Requested' })}
          </Badge>
        );
      case 'rejected':
        return (
          <Badge
            variant="outline"
            className="border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800/60 dark:bg-rose-950/40 dark:text-rose-300 gap-1.5 font-medium shadow-none rounded-full px-2.5 py-0.5"
          >
            <XCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
            {t('status.rejected', { defaultValue: 'Rejected' })}
          </Badge>
        );
      case 'submitted':
      case 'under_review':
        return (
          <Badge
            variant="outline"
            className="border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-300 gap-1.5 font-medium shadow-none rounded-full px-2.5 py-0.5"
          >
            <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            {t('status.under_review', { defaultValue: 'Under Review' })}
          </Badge>
        );
      case 'draft':
        return (
          <Badge
            variant="outline"
            className="border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 gap-1.5 font-medium shadow-none rounded-full px-2.5 py-0.5"
          >
            <Clock className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
            {t('status.draft', { defaultValue: 'Draft' })}
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 gap-1.5 font-medium shadow-none rounded-full px-2.5 py-0.5"
          >
            {status}
          </Badge>
        );
    }
  };

  const getTypeBadge = (typeCode?: string) => {
    switch (typeCode) {
      case 'daily':
        return (
          <Badge
            variant="outline"
            className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300 shadow-none rounded-full px-2.5 py-0.5"
          >
            {t('daily', { defaultValue: 'Daily' })}
          </Badge>
        );
      case 'weekly':
        return (
          <Badge
            variant="outline"
            className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-300 shadow-none rounded-full px-2.5 py-0.5"
          >
            {t('weekly', { defaultValue: 'Weekly' })}
          </Badge>
        );
      case 'monthly':
        return (
          <Badge
            variant="outline"
            className="border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800/60 dark:bg-purple-950/40 dark:text-purple-300 shadow-none rounded-full px-2.5 py-0.5"
          >
            {t('monthly', { defaultValue: 'Monthly' })}
          </Badge>
        );
      case 'final':
        return (
          <Badge
            variant="outline"
            className="border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800/60 dark:bg-indigo-950/40 dark:text-indigo-300 shadow-none rounded-full px-2.5 py-0.5"
          >
            {t('final', { defaultValue: 'Final' })}
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 shadow-none rounded-full px-2.5 py-0.5"
          >
            {typeCode}
          </Badge>
        );
    }
  };

  // Stats calculation. `total` comes from the server's true count across
  // every page; the pending/approved/revision breakdown reflects only the
  // currently loaded page — the same trade-off TrainingAssignmentsPage
  // makes for its own secondary stats.
  const stats = useMemo(() => {
    const total = pagination?.total ?? reports.length;
    const pending = reports.filter(
      (r) => r.status === 'submitted' || r.status === 'under_review'
    ).length;
    const approved = reports.filter((r) => r.status === 'approved').length;
    const revision = reports.filter((r) => r.status === 'revision_requested').length;
    return { total, pending, approved, revision };
  }, [reports, pagination]);

  // Unique companies and opportunities derived from reports
  const companies = useMemo(() => {
    return Array.from(
      new Set(reports.map((r) => resolveLocalizedText(r.company?.name)).filter(Boolean))
    );
  }, [reports, resolveLocalizedText]);

  const opportunities = useMemo(() => {
    return Array.from(
      new Set(reports.map((r) => resolveLocalizedText(r.opportunity?.title)).filter(Boolean))
    );
  }, [reports, resolveLocalizedText]);

  // Distinct placements currently loaded, for the "Placement" filter — only
  // meaningful (and only rendered) once includeHistory has brought more
  // than one assignment per student into view; each entry disambiguates
  // by pairing the student's name with the opportunity title, since a
  // student can appear under more than one placement.
  const assignments = useMemo(() => {
    const seen = new Map<number, { id: number; label: string; isCurrent: boolean }>();
    reports.forEach((r) => {
      if (!r.training_assignment_id || seen.has(r.training_assignment_id)) return;
      const studentName = r.student?.name ?? '';
      const oppTitle = resolveLocalizedText(r.opportunity?.title);
      seen.set(r.training_assignment_id, {
        id: r.training_assignment_id,
        label: [studentName, oppTitle].filter(Boolean).join(' — '),
        isCurrent: Boolean(r.is_current_assignment),
      });
    });
    return Array.from(seen.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [reports, resolveLocalizedText]);

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      // Type filter
      if (selectedType !== 'all') {
        const typeId = parseInt(selectedType, 10);
        if (!isNaN(typeId) && report.report_type_id !== typeId) {
          return false;
        }
      }

      // Status filter
      if (selectedStatus !== 'all') {
        if (selectedStatus === 'pending') {
          if (report.status !== 'submitted' && report.status !== 'under_review') {
            return false;
          }
        } else if (report.status !== selectedStatus) {
          return false;
        }
      }

      // Company filter
      if (selectedCompany !== 'all') {
        const compName = resolveLocalizedText(report.company?.name);
        if (compName !== selectedCompany) {
          return false;
        }
      }

      // Opportunity filter
      if (selectedOpportunity !== 'all') {
        const oppTitle = resolveLocalizedText(report.opportunity?.title);
        if (oppTitle !== selectedOpportunity) {
          return false;
        }
      }

      // Placement filter — isolate one specific assignment's reports
      // (current or, once includeHistory is on, historical).
      if (selectedAssignment !== 'all') {
        const assignmentId = parseInt(selectedAssignment, 10);
        if (!isNaN(assignmentId) && report.training_assignment_id !== assignmentId) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const formatted = formatReportTitle(report).toLowerCase();
        const titleMatch = report.title?.toLowerCase().includes(q) || formatted.includes(q);
        const studentNameMatch = report.student?.name?.toLowerCase().includes(q);
        const studentNumMatch = report.student?.student_number?.toLowerCase().includes(q);
        const compMatch = resolveLocalizedText(report.company?.name).toLowerCase().includes(q);
        const oppMatch = resolveLocalizedText(report.opportunity?.title).toLowerCase().includes(q);
        if (!titleMatch && !studentNameMatch && !studentNumMatch && !compMatch && !oppMatch) {
          return false;
        }
      }

      return true;
    });
  }, [
    reports,
    selectedType,
    selectedStatus,
    selectedCompany,
    selectedOpportunity,
    selectedAssignment,
    searchQuery,
    formatReportTitle,
    resolveLocalizedText,
  ]);

  const handleOpenReview = (report: ReportItem) => {
    setSelectedReportId(report.id);
    reset({ decision: '', grade: '', feedback: '' });
    dispatch(clearReportErrors());
    dispatch(fetchReportReviews(report.id));
    setReviewDialogOpen(true);
  };

  const handleDecisionSelect = (dec: 'approved' | 'revision_requested' | 'rejected') => {
    setValue('decision', dec, { shouldValidate: isSubmitted });
    if (isSubmitted) clearErrors('decision');
  };

  const onReviewSubmit = async (values: ReviewReportFormValues) => {
    if (!selectedReport) return;

    const payload: ReviewReportPayload = {
      decision: values.decision as 'approved' | 'revision_requested' | 'rejected',
      feedback: values.feedback.trim(),
      grade: values.decision === 'approved' ? parseFloat(values.grade) : null,
    };

    const result = await dispatch(reviewReport({ reportId: selectedReport.id, payload }));

    if (reviewReport.fulfilled.match(result)) {
      toast.success(
        t('supervisor.toasts.reviewedSuccess', { defaultValue: 'Report evaluated successfully.' })
      );
      setReviewDialogOpen(false);
    } else {
      toast.error(result.payload?.message || reviewError || 'Failed to submit review');
    }
  };

  // Dynamic feedback placeholder per TEP-684
  const feedbackPlaceholder = useMemo(() => {
    if (decision === 'approved') {
      return t('supervisor.dialog.feedbackPlaceholderApprove', {
        defaultValue: 'Add constructive remarks and commendations for the student...',
      });
    }
    if (decision === 'revision_requested') {
      return t('supervisor.dialog.feedbackPlaceholderRevision', {
        defaultValue:
          'Specify clearly what revisions and corrections the student must make before resubmitting...',
      });
    }
    if (decision === 'rejected') {
      return t('supervisor.dialog.feedbackPlaceholderReject', {
        defaultValue: 'State the explicit reasons why this report is rejected...',
      });
    }
    return t('supervisor.dialog.feedbackPlaceholderGeneric', {
      defaultValue: 'Enter your evaluation feedback here...',
    });
  }, [decision, t]);

  const activeReviews = selectedReport ? reportReviews[selectedReport.id] || [] : [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t('supervisor.title', { defaultValue: 'Training Reports Review' })}
          </h1>
          <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">
            {t('supervisor.subtitle', {
              defaultValue:
                'Review, evaluate, and track periodic student reports across your assigned training placements.',
            })}
          </p>
        </div>
      </div>

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Reports */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {t('supervisor.stats.total', { defaultValue: 'Total Reports' })}
              </p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {stats.total}
              </h3>
            </div>
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <FileText className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Pending Review */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {t('supervisor.stats.pending', { defaultValue: 'Pending Review' })}
              </p>
              <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {stats.pending}
              </h3>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
              <Clock className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Approved */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {t('supervisor.stats.approved', { defaultValue: 'Approved' })}
              </p>
              <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {stats.approved}
              </h3>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Needs Revision */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {t('supervisor.stats.revision', { defaultValue: 'Needs Revision' })}
              </p>
              <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                {stats.revision}
              </h3>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
              <AlertCircle className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-card">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row flex-wrap items-center gap-3">
            {/* Search */}
            <div className="flex-1 min-w-[240px] relative w-full">
              <Search
                className={cn(
                  'absolute top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400',
                  isRTL ? 'right-3' : 'left-3'
                )}
              />
              <Input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder={t('supervisor.filters.searchPlaceholder', {
                  defaultValue: 'Search by report title, student name, or ID...',
                })}
                className={cn(
                  'h-10 text-sm bg-slate-100/80 dark:bg-slate-800/80 border-0 shadow-none focus-visible:ring-1 focus-visible:ring-primary/20 rounded-lg w-full',
                  isRTL ? 'pr-9' : 'pl-9'
                )}
              />
            </div>

            {/* Company Filter (if multiple companies present) */}
            {companies.length > 0 && (
              <div className="w-full sm:w-auto min-w-[150px]">
                <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                  <SelectTrigger className="h-10 text-sm cursor-pointer border-0 shadow-none bg-slate-100/80 dark:bg-slate-800/80 rounded-lg px-3">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <SelectValue
                        placeholder={t('supervisor.filters.allCompanies', {
                          defaultValue: 'All Companies',
                        })}
                      />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t('supervisor.filters.allCompanies', { defaultValue: 'All Companies' })}
                    </SelectItem>
                    {companies.map((company, idx) => (
                      <SelectItem key={idx} value={company}>
                        {company}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Opportunity Filter */}
            {opportunities.length > 0 && (
              <div className="w-full sm:w-auto min-w-[160px]">
                <Select value={selectedOpportunity} onValueChange={setSelectedOpportunity}>
                  <SelectTrigger className="h-10 text-sm cursor-pointer border-0 shadow-none bg-slate-100/80 dark:bg-slate-800/80 rounded-lg px-3">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <Briefcase className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <SelectValue
                        placeholder={t('supervisor.filters.allOpportunities', {
                          defaultValue: 'All Opportunities',
                        })}
                      />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t('supervisor.filters.allOpportunities', {
                        defaultValue: 'All Opportunities',
                      })}
                    </SelectItem>
                    {opportunities.map((opp, idx) => (
                      <SelectItem key={idx} value={opp}>
                        {opp}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Placement Filter — only worth showing once more than one
                assignment is actually loaded (i.e. once includeHistory has
                brought a student's past placement(s) into view, or a
                supervisor's portfolio spans more than one assignment). */}
            {assignments.length > 1 && (
              <div className="w-full sm:w-auto min-w-[200px]">
                <Select value={selectedAssignment} onValueChange={setSelectedAssignment}>
                  <SelectTrigger className="h-10 text-sm cursor-pointer border-0 shadow-none bg-slate-100/80 dark:bg-slate-800/80 rounded-lg px-3">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <History className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <SelectValue
                        placeholder={t('supervisor.filters.allPlacements', {
                          defaultValue: 'All Placements',
                        })}
                      />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      {t('supervisor.filters.allPlacements', { defaultValue: 'All Placements' })}
                    </SelectItem>
                    {assignments.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.label}
                        {!a.isCurrent
                          ? ` (${t('supervisor.filters.past', { defaultValue: 'past' })})`
                          : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Include-history toggle — default view is each student's
                current placement only; this brings past placements' reports
                into the list too (see the includeHistory fetch effect). */}
            <Button
              type="button"
              variant={includeHistory ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setIncludeHistory((v) => !v)}
              className="h-10 gap-1.5 text-sm shrink-0 cursor-pointer"
              title={t('supervisor.filters.includeHistoryHint', {
                defaultValue: 'Include reports from past (completed/terminated) placements too',
              })}
            >
              <History className="w-3.5 h-3.5" />
              {t('supervisor.filters.includeHistory', { defaultValue: 'Include past placements' })}
            </Button>

            <div className="w-full sm:w-auto min-w-[130px]">
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="h-10 text-sm cursor-pointer border-0 shadow-none bg-slate-100/80 dark:bg-slate-800/80 rounded-lg px-3">
                  <SelectValue
                    placeholder={t('supervisor.filters.allTypes', { defaultValue: 'All Types' })}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t('supervisor.filters.allTypes', { defaultValue: 'All Types' })}
                  </SelectItem>
                  {reportTypes.map((type) => (
                    <SelectItem key={type.id} value={String(type.id)}>
                      {getLocalizedTypeName(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Select */}
            <div className="w-full sm:w-auto min-w-[140px]">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="h-10 text-sm cursor-pointer border-0 shadow-none bg-slate-100/80 dark:bg-slate-800/80 rounded-lg px-3">
                  <SelectValue
                    placeholder={t('supervisor.filters.allStatuses', {
                      defaultValue: 'All Statuses',
                    })}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t('supervisor.filters.allStatuses', { defaultValue: 'All Statuses' })}
                  </SelectItem>
                  <SelectItem value="pending">
                    {t('status.submitted', { defaultValue: 'Pending Review' })}
                  </SelectItem>
                  <SelectItem value="approved">
                    {t('status.approved', { defaultValue: 'Approved' })}
                  </SelectItem>
                  <SelectItem value="revision_requested">
                    {t('status.revision_requested', { defaultValue: 'Revision Requested' })}
                  </SelectItem>
                  <SelectItem value="rejected">
                    {t('status.rejected', { defaultValue: 'Rejected' })}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reports Grid */}
      {isLoadingReports && reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-sm text-slate-500">Loading reports...</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200 dark:border-slate-800">
          <CardContent className="py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center mb-3">
              <FileText className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              {t('supervisor.empty.title', { defaultValue: 'No reports found' })}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {t('supervisor.empty.description', {
                defaultValue: 'No reports match your current search and filter criteria.',
              })}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReports.map((report) => {
            const isPending = report.status === 'submitted' || report.status === 'under_review';
            const feedbackText = report.feedback || report.latest_review?.feedback;

            return (
              <Card
                key={report.id}
                className={cn(
                  'border transition-all duration-200 hover:shadow-md flex flex-col justify-between',
                  isPending
                    ? 'border-blue-200 dark:border-blue-900/50 bg-white dark:bg-slate-900'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                )}
              >
                <CardContent className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Header: Type and Status */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      {getTypeBadge(report.report_type?.code)}
                      {getStatusBadge(report.status)}
                    </div>

                    {/* Report Title */}
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white line-clamp-1">
                      <HighlightText text={formatReportTitle(report)} query={searchQuery} />
                    </h3>

                    {/* Student Information & Placement Context */}
                    <div className="mt-2.5 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          <HighlightText
                            text={
                              report.student?.name ||
                              t('supervisor.card.student', { defaultValue: 'Student' })
                            }
                            query={searchQuery}
                          />
                        </span>
                        {report.student?.student_number && (
                          <>
                            <span>•</span>
                            <span className="font-mono">
                              <HighlightText
                                text={report.student.student_number}
                                query={searchQuery}
                              />
                            </span>
                          </>
                        )}
                      </div>

                      {(report.company?.name || report.opportunity?.title) && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          {report.company?.name && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-[11px]">
                              <Building2 className="h-3 w-3 text-slate-400" />
                              <HighlightText
                                text={resolveLocalizedText(report.company.name)}
                                query={searchQuery}
                              />
                            </span>
                          )}
                          {report.opportunity?.title && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-medium text-[11px]">
                              <Briefcase className="h-3 w-3 text-blue-400" />
                              <HighlightText
                                text={resolveLocalizedText(report.opportunity.title)}
                                query={searchQuery}
                              />
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Submission Date */}
                    <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-500">
                      <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>
                        {t('supervisor.card.submittedAt', {
                          date: formatDate(report.submitted_at || report.created_at),
                        })}
                      </span>
                    </div>

                    {/* Content Snippet */}
                    {report.content && (
                      <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                        {report.content}
                      </p>
                    )}

                    {/* Attachments Counter */}
                    {report.files && report.files.length > 0 && (
                      <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                        <Paperclip className="h-3.5 w-3.5" />
                        <span>
                          {t('supervisor.card.attachments', {
                            count: report.files.length,
                          })}
                        </span>
                      </div>
                    )}

                    {/* Previous Feedback Banner if any */}
                    {feedbackText && (
                      <div className="mt-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
                        <span className="font-medium text-slate-700 dark:text-slate-300 block mb-0.5">
                          {t('supervisor.card.previousFeedback', {
                            defaultValue: 'Previous Supervisor Feedback',
                          })}
                          :
                        </span>
                        <p className="text-slate-600 dark:text-slate-400 line-clamp-2 italic">
                          "{feedbackText}"
                        </p>
                      </div>
                    )}

                    {/* Grade if approved */}
                    {report.status === 'approved' && report.grade !== null && (
                      <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-1 rounded">
                        <span>{t('supervisor.card.grade', { grade: report.grade })}</span>
                      </div>
                    )}
                  </div>

                  {/* Card Action */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                    <Button
                      onClick={() => handleOpenReview(report)}
                      variant={isPending ? 'default' : 'outline'}
                      className={cn(
                        'w-full gap-2 justify-center font-medium',
                        isPending
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'text-slate-700 dark:text-slate-300'
                      )}
                    >
                      <Eye className="h-4 w-4" />
                      {isPending
                        ? t('supervisor.card.viewReview', { defaultValue: 'View & Review' })
                        : t('supervisor.card.viewDetails', { defaultValue: 'View Details' })}
                    </Button>
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
                عرض {pagination.from || 1} إلى {pagination.to || reports.length} من أصل{' '}
                {pagination.total} تقرير
              </span>
            ) : (
              <span>
                Showing {pagination.from || 1} to {pagination.to || reports.length} of{' '}
                {pagination.total} reports
              </span>
            )}
          </div>

          <div className="flex items-center flex-wrap justify-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1 || isLoadingReports}
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
                        disabled={isLoadingReports}
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
              disabled={currentPage >= pagination.last_page || isLoadingReports}
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

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent
          className="max-w-3xl max-h-[90vh] overflow-y-auto"
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          {selectedReport && (
            <>
              <DialogHeader className="space-y-2 ltr:pr-12 rtl:pl-12">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {getTypeBadge(selectedReport.report_type?.code)}
                    <span className="text-xs text-slate-500 font-mono">
                      v{selectedReport.version}
                    </span>
                  </div>
                  {getStatusBadge(selectedReport.status)}
                </div>
                <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
                  {formatReportTitle(selectedReport)}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  {t('supervisor.dialog.title', { defaultValue: 'Review Student Report' })}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 pt-2">
                {/* Student Info Card */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4 text-sm">
                  <div>
                    <span className="text-xs text-slate-500 block">
                      {t('supervisor.dialog.studentDetails', { defaultValue: 'Student Details' })}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {selectedReport.student?.name || '—'}
                    </span>
                    {selectedReport.student?.student_number && (
                      <span className="text-xs text-slate-500 ml-2">
                        ({selectedReport.student.student_number})
                      </span>
                    )}

                    {(selectedReport.company?.name || selectedReport.opportunity?.title) && (
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        {selectedReport.company?.name && (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                            <Building2 className="h-3.5 w-3.5 text-slate-400" />
                            {resolveLocalizedText(selectedReport.company.name)}
                          </span>
                        )}
                        {selectedReport.opportunity?.title && (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                            <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                            {resolveLocalizedText(selectedReport.opportunity.title)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-6 text-xs text-slate-600 dark:text-slate-400">
                    <div>
                      <span className="text-slate-400 block">
                        {t('submissionDate', { defaultValue: 'Submission Date' })}:
                      </span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {formatDate(selectedReport.submitted_at || selectedReport.created_at)}
                      </span>
                    </div>
                    {selectedReport.due_at && (
                      <div>
                        <span className="text-slate-400 block">
                          {t('dueDate', { defaultValue: 'Due Date' })}:
                        </span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {formatDate(selectedReport.due_at)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Report Content */}
                <div>
                  <Label className="text-sm font-semibold text-slate-900 dark:text-white mb-2 block">
                    {t('supervisor.dialog.reportContent', { defaultValue: 'Report Content' })}
                  </Label>
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50 text-sm leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                    {selectedReport.content || '—'}
                  </div>
                </div>

                {/* Attachments */}
                {selectedReport.files && selectedReport.files.length > 0 && (
                  <div>
                    <Label className="text-sm font-semibold text-slate-900 dark:text-white mb-2 block">
                      {t('supervisor.dialog.attachments', { defaultValue: 'Attachments' })}
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedReport.files.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-sm"
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <Paperclip className="h-4 w-4 text-slate-400 shrink-0" />
                            <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                              {file.original_name}
                            </span>
                          </div>
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 ml-2"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            {t('supervisor.dialog.view', { defaultValue: 'View' })}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Review History */}
                {activeReviews.length > 0 && (
                  <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">
                      <History className="h-4 w-4 text-slate-500" />
                      <span>
                        {t('supervisor.dialog.historyTitle', { defaultValue: 'Review History' })}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {activeReviews.map((rev) => (
                        <div
                          key={rev.id}
                          className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between text-slate-500">
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {rev.reviewer?.name || 'Academic Supervisor'}
                            </span>
                            <span>{formatDate(rev.created_at)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                'font-semibold capitalize',
                                rev.decision === 'approved'
                                  ? 'text-emerald-600'
                                  : rev.decision === 'revision_requested'
                                    ? 'text-amber-600'
                                    : 'text-rose-600'
                              )}
                            >
                              {t(`status.${rev.decision}`, { defaultValue: rev.decision })}
                            </span>
                          </div>
                          {rev.feedback && (
                            <p className="text-slate-600 dark:text-slate-400 italic">
                              "{rev.feedback}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Review Action Form for Submitted Reports */}
                {selectedReport.status === 'submitted' ||
                selectedReport.status === 'under_review' ? (
                  <form
                    onSubmit={handleSubmit(onReviewSubmit)}
                    noValidate
                    className="border-t border-slate-200 dark:border-slate-800 pt-6 space-y-6"
                  >
                    <div>
                      <h4 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
                        {t('supervisor.dialog.reviewSection', {
                          defaultValue: 'Supervisor Evaluation & Decision',
                        })}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {t('supervisor.dialog.decisionLabel', {
                          defaultValue: 'Select an evaluation decision below:',
                        })}
                      </p>

                      {/* 3 Choice Buttons */}
                      <div className="grid grid-cols-3 gap-2.5 sm:gap-3 mt-3">
                        <button
                          type="button"
                          onClick={() => handleDecisionSelect('approved')}
                          className={cn(
                            'w-full min-w-0 p-3 min-h-[76px] rounded-xl flex flex-col items-center justify-center gap-1.5 border-2 transition-all cursor-pointer text-center',
                            decision === 'approved'
                              ? 'border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-semibold shadow-xs'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-emerald-300 hover:bg-emerald-50/30'
                          )}
                        >
                          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span className="text-xs sm:text-sm font-medium leading-tight break-words">
                            {t('supervisor.dialog.approve', { defaultValue: 'Approve' })}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDecisionSelect('revision_requested')}
                          className={cn(
                            'w-full min-w-0 p-3 min-h-[76px] rounded-xl flex flex-col items-center justify-center gap-1.5 border-2 transition-all cursor-pointer text-center',
                            decision === 'revision_requested'
                              ? 'border-amber-600 bg-amber-50/80 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 font-semibold shadow-xs'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-amber-300 hover:bg-amber-50/30'
                          )}
                        >
                          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span className="text-xs sm:text-sm font-medium leading-tight break-words">
                            {t('supervisor.dialog.requestRevision', {
                              defaultValue: 'Request Revision',
                            })}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDecisionSelect('rejected')}
                          className={cn(
                            'w-full min-w-0 p-3 min-h-[76px] rounded-xl flex flex-col items-center justify-center gap-1.5 border-2 transition-all cursor-pointer text-center',
                            decision === 'rejected'
                              ? 'border-rose-600 bg-rose-50/80 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 font-semibold shadow-xs'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-rose-300 hover:bg-rose-50/30'
                          )}
                        >
                          <XCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0" />
                          <span className="text-xs sm:text-sm font-medium leading-tight break-words">
                            {t('supervisor.dialog.reject', { defaultValue: 'Reject' })}
                          </span>
                        </button>
                      </div>

                      {getFieldError('decision') && (
                        <p className="text-xs text-destructive font-medium mt-1.5">
                          {getFieldError('decision')}
                        </p>
                      )}
                    </div>

                    {/* Grade Input when approving */}
                    {decision === 'approved' && (
                      <div className="space-y-1.5 p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60">
                        <Label
                          htmlFor="grade"
                          className="text-sm font-semibold text-emerald-900 dark:text-emerald-300"
                          required
                        >
                          {t('supervisor.dialog.gradeLabel', { defaultValue: 'Grade (0 - 100)' })}
                        </Label>
                        <Input
                          id="grade"
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          aria-invalid={!!getFieldError('grade')}
                          placeholder={t('supervisor.dialog.gradePlaceholder', {
                            defaultValue: 'Enter grade (e.g. 90)',
                          })}
                          className="bg-white dark:bg-slate-900"
                          {...register('grade', {
                            onChange: () => {
                              if (getFieldError('grade')) clearErrors('grade');
                            },
                          })}
                        />
                        {getFieldError('grade') && (
                          <p className="text-xs text-destructive font-medium mt-1">
                            {getFieldError('grade')}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Feedback Field */}
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="feedback"
                        className="text-sm font-semibold text-slate-900 dark:text-white"
                        required
                      >
                        {t('supervisor.dialog.feedbackLabel', { defaultValue: 'Feedback & Notes' })}
                      </Label>
                      <Textarea
                        id="feedback"
                        rows={4}
                        aria-invalid={!!getFieldError('feedback')}
                        placeholder={feedbackPlaceholder}
                        className="resize-none"
                        {...register('feedback', {
                          onChange: () => {
                            if (getFieldError('feedback')) clearErrors('feedback');
                          },
                        })}
                      />
                      {getFieldError('feedback') && (
                        <p className="text-xs text-destructive font-medium mt-1">
                          {getFieldError('feedback')}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setReviewDialogOpen(false)}
                      >
                        {t('cancel', { defaultValue: 'Cancel' })}
                      </Button>
                      <Button
                        type="submit"
                        disabled={isReviewing}
                        className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px]"
                      >
                        {isReviewing ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            {t('supervisor.dialog.submitting', { defaultValue: 'Submitting...' })}
                          </>
                        ) : (
                          t('supervisor.dialog.submitDecision', {
                            defaultValue: 'Confirm Decision',
                          })
                        )}
                      </Button>
                    </div>
                  </form>
                ) : (
                  /* Read-Only Status & Feedback for Reviewed Reports */
                  <div className="border-t border-slate-200 dark:border-slate-800 pt-6 space-y-4">
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-slate-500">
                          {t('supervisor.dialog.decisionLabel', {
                            defaultValue: 'Review Decision',
                          })}
                        </span>
                        {getStatusBadge(selectedReport.status)}
                      </div>
                      {selectedReport.grade !== null && (
                        <p className="text-sm font-semibold text-emerald-600 mb-2">
                          {t('supervisor.card.grade', { grade: selectedReport.grade })}
                        </p>
                      )}
                      {selectedReport.feedback && (
                        <div>
                          <span className="text-xs text-slate-500 block mb-1">
                            {t('supervisor.dialog.feedbackLabel', {
                              defaultValue: 'Feedback & Notes',
                            })}
                            :
                          </span>
                          <p className="text-sm text-slate-800 dark:text-slate-200 italic">
                            "{selectedReport.feedback}"
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setReviewDialogOpen(false)}
                      >
                        {t('supervisor.dialog.close', { defaultValue: 'Close' })}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupervisorReportsPage;