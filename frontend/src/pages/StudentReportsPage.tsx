import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, Controller, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createReportSchema, type ReportFormValues } from '@/lib/validations/reports';
import { useAppDispatch, useAppSelector } from '@/store';
import { fetchReportTypes } from '@/store/slices/lookupSlice';
import { fetchMyTrainingAssignment } from '@/store/slices/trainingAssignmentSlice';
import {
  fetchReports,
  createReport,
  updateReport,
  submitReport,
  uploadReportFile,
  clearReportErrors,
} from '@/store/slices/reportSlice';
import type { ReportItem, ReportStatus, ReportAttachment } from '@/types/reports';
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
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Plus,
  Loader2,
  FilePen,
  Eye,
  AlertTriangle,
  Upload,
  Paperclip,
  X,
  Send,
  File as FileIcon,
  Building2,
  GraduationCap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

/** A pending file queued for upload (not yet uploaded) */
interface PendingFile {
  kind: 'pending';
  localId: string; // random key for React list
  file: File;
}

/** An already-uploaded file (either from server or just uploaded) */
interface UploadedFile {
  kind: 'uploaded';
  localId: string;
  id: number;
  original_name: string;
  url: string;
  mime_type: string;
  size_bytes: number;
}

type AttachmentEntry = PendingFile | UploadedFile;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_FILE_EXTENSIONS = ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg', 'webp', 'zip'];
const ACCEPTED_TYPES = '.pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.zip';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function serverAttachmentToEntry(a: ReportAttachment): UploadedFile {
  return {
    kind: 'uploaded',
    localId: `server-${a.id}`,
    id: a.id,
    original_name: a.original_name,
    url: a.url,
    mime_type: a.mime_type,
    size_bytes: a.size_bytes,
  };
}

const FEEDBACK_CLAMP_THRESHOLD = 240;

function FeedbackNote({
  text,
  variant,
  label,
}: {
  text: string;
  variant: 'revision' | 'rejected' | 'default';
  label: string;
}) {
  const { t } = useTranslation('reports');
  const [expanded, setExpanded] = useState(false);

  const colorClasses =
    variant === 'revision'
      ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200'
      : variant === 'rejected'
        ? 'bg-red-50/90 dark:bg-red-950/40 border-red-200 dark:border-red-900/60 text-red-900 dark:text-red-200'
        : 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/50 text-gray-700 dark:text-blue-200';

  const linkClasses =
    variant === 'revision'
      ? 'text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100'
      : variant === 'rejected'
        ? 'text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100'
        : 'text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100';

  const isLong = text.length > FEEDBACK_CLAMP_THRESHOLD;

  return (
    <div className={cn('p-3.5 rounded-lg border text-xs md:text-sm', colorClasses)}>
      <div className="flex items-center gap-1.5 font-semibold mb-1">
        {variant === 'revision' ? (
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
        ) : variant === 'rejected' ? (
          <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
        ) : (
          <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
        )}
        <span>{label}:</span>
      </div>
      <p className={cn('whitespace-pre-wrap', !expanded && isLong && 'line-clamp-4')}>{text}</p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className={cn(
            'mt-1.5 text-xs font-semibold underline underline-offset-2 cursor-pointer',
            linkClasses
          )}
        >
          {expanded
            ? t('showLess', { defaultValue: 'Show less' })
            : t('showMore', { defaultValue: 'Show more' })}
        </button>
      )}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export const StudentReportsPage: React.FC = () => {
  const { t, i18n } = useTranslation(['reports', 'common']);
  const isRTL = i18n.language === 'ar';
  const toast = useToast();
  const dispatch = useAppDispatch();

  // Redux state
  const { reportTypes = [] } = useAppSelector((state) => state.lookup);
  const {
    reports = [],
    isLoadingReports = false,
    isCreating = false,
    isUpdating = false,
    isSubmitting = false,
    validationErrors,
  } = useAppSelector((state) => state.reports);
  const { myAssignment, isFetchingMyAssignment } = useAppSelector(
    (state) => state.trainingAssignment
  );

  // Local state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [reportToSubmit, setReportToSubmit] = useState<ReportItem | null>(null);
  const [editingReport, setEditingReport] = useState<ReportItem | null>(null);
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  // Multi-file attachment state
  const [attachments, setAttachments] = useState<AttachmentEntry[]>([]);
  const [uploadingIds, setUploadingIds] = useState<Set<string>>(new Set());
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validation schema & react-hook-form
  const schema = useMemo(() => createReportSchema(t), [t]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    setError,
    clearErrors,
    trigger,
    formState: { errors, isSubmitted },
  } = useForm<ReportFormValues>({
    resolver: zodResolver(schema) as Resolver<ReportFormValues>,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      report_type_id: '',
      title: '',
      report_number: '1',
      due_at: '',
      content: '',
    },
  });

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
          setError(field as keyof ReportFormValues, {
            type: 'server',
            message: errorList[0],
          });
        }
      });
    }
  }, [validationErrors, setError]);

  const getFieldError = (field: keyof ReportFormValues): string | undefined => {
    if (errors[field]?.message) return errors[field]?.message;
    const serverErr = validationErrors?.[field];
    if (serverErr && serverErr.length > 0) {
      return serverErr[0];
    }
    return undefined;
  };

  // Fetch initial data once on mount
  useEffect(() => {
    dispatch(fetchReports());
    dispatch(fetchReportTypes());
    dispatch(fetchMyTrainingAssignment());
  }, [dispatch]);

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

  const getLocalizedName = useCallback(
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
        const typeTranslation = t(`reportTypes.${item.code}`, { defaultValue: '' });
        if (typeTranslation) return typeTranslation;
      }

      if (typeof item.name === 'string') return item.name;
      return item.code || '';
    },
    [isRTL, t]
  );

  const formatReportTitle = useCallback(
    (report?: ReportItem | null) => {
      if (!report) return '';
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

  const formatReportNumberLabel = useCallback(
    (report?: ReportItem | null) => {
      if (!report) return '';
      const code = report.report_type?.code;
      const num = report.report_number ?? 1;
      if (code === 'weekly') {
        return t('periodLabels.week', {
          number: num,
          defaultValue: isRTL ? `الأسبوع ${num}` : `Week ${num}`,
        });
      }
      if (code === 'monthly') {
        return t('periodLabels.month', {
          number: num,
          defaultValue: isRTL ? `الشهر ${num}` : `Month ${num}`,
        });
      }
      if (code === 'final') {
        return t('periodLabels.final', {
          defaultValue: isRTL ? 'النهائي' : 'Final',
        });
      }
      return isRTL ? `رقم ${num}` : `#${num}`;
    },
    [isRTL, t]
  );

  const formatDate = useCallback(
    (dateString?: string | null) => {
      if (!dateString) return '—';
      try {
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return dateString;
        return d.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });
      } catch {
        return dateString;
      }
    },
    [isRTL]
  );

  const getStatusIcon = (status: ReportStatus, isOverdue: boolean) => {
    if (isOverdue) {
      return <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0" />;
    }
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0" />;
      case 'under_review':
        return <Clock className="h-5 w-5 text-amber-500 dark:text-amber-400 shrink-0" />;
      case 'submitted':
        return <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />;
      case 'revision_requested':
        return <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />;
      case 'draft':
      default:
        return <FilePen className="h-5 w-5 text-slate-500 dark:text-slate-400 shrink-0" />;
    }
  };

  const getStatusBadge = (status: ReportStatus, isOverdue: boolean) => {
    if (isOverdue) {
      return (
        <Badge
          variant="outline"
          className="bg-red-100 text-red-800 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-900 rounded-full px-3 py-0.5 text-xs font-medium shadow-none"
        >
          {t('status.overdue')}
        </Badge>
      );
    }

    const badgeStyles: Record<ReportStatus, { bg: string; text: string; border: string }> = {
      approved: {
        bg: 'bg-green-100 dark:bg-green-950/50',
        text: 'text-green-800 dark:text-green-300',
        border: 'border-green-200 dark:border-green-900',
      },
      submitted: {
        bg: 'bg-yellow-100 dark:bg-yellow-950/50',
        text: 'text-yellow-800 dark:text-yellow-300',
        border: 'border-yellow-200 dark:border-yellow-900',
      },
      under_review: {
        bg: 'bg-blue-100 dark:bg-blue-950/50',
        text: 'text-blue-800 dark:text-blue-300',
        border: 'border-blue-200 dark:border-blue-900',
      },
      revision_requested: {
        bg: 'bg-amber-100 dark:bg-amber-950/50',
        text: 'text-amber-800 dark:text-amber-300',
        border: 'border-amber-200 dark:border-amber-900',
      },
      rejected: {
        bg: 'bg-red-100 dark:bg-red-950/50',
        text: 'text-red-800 dark:text-red-300',
        border: 'border-red-200 dark:border-red-900',
      },
      draft: {
        bg: 'bg-slate-100 dark:bg-slate-800',
        text: 'text-slate-700 dark:text-slate-300',
        border: 'border-slate-200 dark:border-slate-700',
      },
    };

    const style = badgeStyles[status] || badgeStyles.draft;
    const label = t(`status.${status}`) || status;

    return (
      <Badge
        variant="outline"
        className={cn(
          'rounded-full px-3 py-0.5 text-xs font-medium shadow-none',
          style.bg,
          style.text,
          style.border
        )}
      >
        {label}
      </Badge>
    );
  };

const hasExistingFinalReport = useMemo(() => {
  const finalType = reportTypes.find((t) => t.code === 'final');
  if (!finalType) return false;
  return reports.some((r) => String(r.report_type_id) === String(finalType.id));
}, [reports, reportTypes]);

  // Allowed report types for this assignment based on coordinator configuration
  const allowedReportTypes = useMemo(() => {
    if (!myAssignment?.report_configuration) {
      return reportTypes;
    }
    return reportTypes.filter((t) => {
      const cfg = myAssignment.report_configuration?.[t.code];
      return cfg === undefined || cfg.enabled !== false;
    });
  }, [reportTypes, myAssignment]);

  // Quota helper for a given report type code
const getTypeQuotaInfo = useCallback(
  (typeCode?: string) => {
    if (!typeCode) return { maxCount: null, count: 0, isReached: false };
    const config = myAssignment?.report_configuration?.[typeCode];
    const maxCount = config?.max_count;
    const count = reports.filter((r) => r.report_type?.code === typeCode).length;

    if (maxCount === undefined || maxCount === null || maxCount <= 0) {
      return { maxCount: null, count, isReached: false };
    }
    return { maxCount, count, isReached: count >= maxCount };
  },
  [myAssignment, reports]
);

  // Total required reports ceiling check
const isTotalQuotaReached = useMemo(() => {
  const totalRequired = myAssignment?.required_reports_count;
  if (!totalRequired || totalRequired <= 0) return false;
  const activeCount = reports.length;
  return activeCount >= totalRequired;
}, [myAssignment, reports]);

  // Recurring report tiers in ascending granularity order. `final` is
  // handled separately below since it sits after all of them rather than
  // at a fixed position in this list — mirrors
  // TrainingAssignment::REPORT_TYPE_HIERARCHY on the backend.
  const REPORT_TYPE_HIERARCHY = ['daily', 'weekly', 'monthly'] as const;

  const isTypeEnabled = useCallback(
    (typeCode: string) => {
      const cfg = myAssignment?.report_configuration?.[typeCode];
      return cfg === undefined || cfg.enabled !== false;
    },
    [myAssignment]
  );

  const getTypeMaxCount = useCallback(
    (typeCode: string): number | null => {
      const cfg = myAssignment?.report_configuration?.[typeCode];
      if (cfg?.max_count) return cfg.max_count;
      return typeCode === 'final' ? 1 : null;
    },
    [myAssignment]
  );

  // The nearest enabled tier below typeCode, or null if nothing is gating
  // it. Mirrors TrainingAssignment::getPrerequisiteReportType() — disabled
  // tiers are skipped rather than breaking the chain, and `final` resolves
  // to the nearest enabled recurring tier of any kind.
  const getPrerequisiteType = useCallback(
    (typeCode: string): string | null => {
      if (typeCode === 'final') {
        for (const candidate of [...REPORT_TYPE_HIERARCHY].reverse()) {
          if (isTypeEnabled(candidate) && getTypeMaxCount(candidate)) return candidate;
        }
        return null;
      }
      const index = REPORT_TYPE_HIERARCHY.indexOf(typeCode as (typeof REPORT_TYPE_HIERARCHY)[number]);
      if (index <= 0) return null;
      for (let i = index - 1; i >= 0; i--) {
        const candidate = REPORT_TYPE_HIERARCHY[i];
        if (isTypeEnabled(candidate) && getTypeMaxCount(candidate)) return candidate;
      }
      return null;
    },
    [isTypeEnabled, getTypeMaxCount]
  );

  // Approved-report count required from the prerequisite type before
  // report #reportNumber of typeCode may be created. Distributes the
  // prerequisite's total (NTILE-style — earliest slots absorb the
  // remainder) — mirrors TrainingAssignment::getSequentialThreshold().
  const getSequentialThreshold = useCallback(
    (typeCode: string, reportNumber: number): number | null => {
      const prereqType = getPrerequisiteType(typeCode);
      if (!prereqType) return null;

      const lowerMax = getTypeMaxCount(prereqType);
      const higherMax = typeCode === 'final' ? 1 : getTypeMaxCount(typeCode);
      if (!lowerMax || !higherMax) return null;

      const base = Math.floor(lowerMax / higherMax);
      const remainder = lowerMax % higherMax;

      let cumulative = 0;
      for (let i = 1; i <= Math.min(reportNumber, higherMax); i++) {
        cumulative += base + (i <= remainder ? 1 : 0);
      }
      return cumulative;
    },
    [getPrerequisiteType, getTypeMaxCount]
  );

  // Whether the *next* report of typeCode is currently blocked by an
  // unmet prerequisite tier, plus the numbers needed to explain why.
  const getSequenceGate = useCallback(
    (typeCode: string) => {
      const prereqType = getPrerequisiteType(typeCode);
      if (!prereqType) {
        return { isBlocked: false, prereqType: null as string | null, required: 0, approved: 0 };
      }

      const nextNumber = reports.filter((r) => r.report_type?.code === typeCode).length + 1;
      const threshold = getSequentialThreshold(typeCode, nextNumber);
      if (threshold === null) {
        return { isBlocked: false, prereqType: null as string | null, required: 0, approved: 0 };
      }

      const approvedCount = reports.filter(
        (r) => r.report_type?.code === prereqType && r.status === 'approved'
      ).length;

      return { isBlocked: approvedCount < threshold, prereqType, required: threshold, approved: approvedCount };
    },
    [getPrerequisiteType, getSequentialThreshold, reports]
  );

  // Quick filtered reports for student
  const visibleReports = useMemo(() => {
    return reports.filter((report) => {
      if (filterStatus !== 'all' && report.status !== filterStatus) {
        return false;
      }
      if (filterType !== 'all') {
        const typeId = parseInt(filterType, 10);
        if (!isNaN(typeId) && report.report_type_id !== typeId) {
          return false;
        }
      }
      return true;
    });
  }, [reports, filterStatus, filterType]);

  // Training is considered complete once the final report has been approved.
  // Block all new report creation and submission at that point.
  const isTrainingCompleted = useMemo(
    () => reports.some((r) => r.report_type?.code === 'final' && r.status === 'approved'),
    [reports]
  );

const getNextReportNumber = useCallback(
  (typeId?: string | number): string => {
    if (!typeId) return '1';
    const type = reportTypes.find((t) => String(t.id) === String(typeId));
    if (type?.code === 'final') return '1';
    const takenNumbers = new Set(
      reports
        .filter((r) => String(r.report_type_id) === String(typeId))
        .map((r) => r.report_number)
    );
    let candidate = 1;
    while (takenNumbers.has(candidate)) {
      candidate += 1;
    }
    return String(candidate);
  },
  [reports, reportTypes]
);

  // ── File handling ──────────────────────────────────────────────────────────

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (fileInputRef.current) fileInputRef.current.value = '';

    setAttachmentError(null);

    const invalidTypeFiles = files.filter((f) => {
      const ext = f.name.split('.').pop()?.toLowerCase() || '';
      return !ALLOWED_FILE_EXTENSIONS.includes(ext);
    });

    if (invalidTypeFiles.length > 0) {
      setAttachmentError(
        t('unsupportedFileType', {
          defaultValue: 'Unsupported file type. Allowed formats: PDF, DOC, DOCX, Images, ZIP.',
        })
      );
      return;
    }

    const tooBig = files.filter((f) => f.size > MAX_FILE_SIZE_BYTES);
    if (tooBig.length > 0) {
      setAttachmentError(t('maxFileSize', { defaultValue: 'Maximum file size is 10MB.' }));
      return;
    }

    const newEntries: PendingFile[] = files.map((f) => ({
      kind: 'pending',
      localId: `${Date.now()}-${Math.random()}`,
      file: f,
    }));

    setAttachments((prev) => [...prev, ...newEntries]);
  };

  const handleRemoveAttachment = (localId: string) => {
    setAttachmentError(null);
    setAttachments((prev) => prev.filter((a) => a.localId !== localId));
  };

  const resetAttachments = () => {
    setAttachmentError(null);
    setAttachments([]);
    setUploadingIds(new Set());
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /** Upload all pending files and return an array of all file IDs (pending + already uploaded). */
  const uploadPendingAndCollectIds = async (): Promise<number[] | null> => {
    const pending = attachments.filter((a): a is PendingFile => a.kind === 'pending');
    const uploaded = attachments.filter((a): a is UploadedFile => a.kind === 'uploaded');

    if (pending.length === 0) {
      return uploaded.map((a) => a.id);
    }

    // Mark pending as uploading
    setUploadingIds(new Set(pending.map((p) => p.localId)));

    const results = await Promise.all(pending.map((p) => dispatch(uploadReportFile(p.file))));

    const uploadedNew: UploadedFile[] = [];
    let hasError = false;

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const pendingEntry = pending[i];
      if (uploadReportFile.fulfilled.match(result)) {
        uploadedNew.push({
          kind: 'uploaded',
          localId: pendingEntry.localId,
          id: result.payload.id,
          original_name: result.payload.original_name,
          url: result.payload.url,
          mime_type: result.payload.mime_type,
          size_bytes: result.payload.size_bytes,
        });
      } else {
        hasError = true;
        setAttachmentError(
          t('fileUploadError', {
            defaultValue: 'Failed to upload {{name}}. Please try again.',
            name: pendingEntry.file.name,
          })
        );
      }
    }

    setUploadingIds(new Set());

    if (hasError) return null;

    // Replace pending entries with uploaded ones in state
    setAttachments((prev) =>
      prev.map((a) => {
        if (a.kind !== 'pending') return a;
        const match = uploadedNew.find((u) => u.localId === a.localId);
        return match ?? a;
      })
    );

    return [...uploaded.map((a) => a.id), ...uploadedNew.map((u) => u.id)];
  };

  // ── Dialog open/close ──────────────────────────────────────────────────────

  const handleOpenCreateDialog = () => {
    dispatch(clearReportErrors());
    setEditingReport(null);
    resetAttachments();
    setAttachmentError(null);

    // Pick first enabled report type that has not yet reached its quota
    const availableTypes = allowedReportTypes.filter((t) => {
      if (t.code === 'final' && hasExistingFinalReport) return false;
      if (getSequenceGate(t.code).isBlocked) return false;
      const quota = getTypeQuotaInfo(t.code);
      return !quota.isReached;
    });

    const defaultTypeId = availableTypes[0]?.id
      ? String(availableTypes[0].id)
      : allowedReportTypes[0]?.id
        ? String(allowedReportTypes[0].id)
        : '';
    reset({
      report_type_id: defaultTypeId,
      title: '',
      report_number: getNextReportNumber(defaultTypeId),
      due_at: '',
      content: '',
    });
    setCreateDialogOpen(true);
  };

  const handleOpenEditDialog = (report: ReportItem) => {
    dispatch(clearReportErrors());
    setEditingReport(report);
    setAttachmentError(null);
    // Pre-populate existing attachments from the report
    const existing: UploadedFile[] = (report.files ?? []).map(serverAttachmentToEntry);
    setAttachments(existing);
    setUploadingIds(new Set());
    if (fileInputRef.current) fileInputRef.current.value = '';
    reset({
      report_type_id: String(report.report_type_id ?? ''),
      title: report.title ?? '',
      report_number: report.report_number !== null ? String(report.report_number) : '1',
      due_at: report.due_at ? report.due_at.substring(0, 10) : '',
      content: report.content ?? '',
    });
    setCreateDialogOpen(true);
  };

  const handleOpenViewDialog = (report: ReportItem) => {
    setSelectedReport(report);
    setViewDialogOpen(true);
  };

  const handleOpenConfirmSubmit = (report: ReportItem) => {
    setReportToSubmit(report);
    setConfirmSubmitOpen(true);
  };

  const handleConfirmSubmit = async () => {
    if (!reportToSubmit) return;
    const res = await dispatch(submitReport(reportToSubmit.id));
    if (submitReport.fulfilled.match(res)) {
      toast.success(t('toasts.submittedSuccess'));
      setConfirmSubmitOpen(false);
      setReportToSubmit(null);
      if (viewDialogOpen && selectedReport?.id === reportToSubmit.id) {
        setSelectedReport(res.payload);
      }
      if (createDialogOpen && editingReport?.id === reportToSubmit.id) {
        setCreateDialogOpen(false);
        setEditingReport(null);
      }
    } else {
      toast.error(res.payload?.message || t('errors.genericSubmit'));
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const onSubmit = async (values: ReportFormValues) => {
    setAttachmentError(null);
    // Upload any pending files first
    const fileIds = await uploadPendingAndCollectIds();
    if (fileIds === null) {
      // Upload failed — stop submission
      return;
    }

    if (editingReport) {
      const res = await dispatch(
        updateReport({
          reportId: editingReport.id,
          payload: {
            title: values.title.trim(),
            content: values.content.trim(),
            due_at: values.due_at ? `${values.due_at} 23:59:59` : null,
            file_ids: fileIds,
          },
        })
      );

      if (updateReport.fulfilled.match(res)) {
        toast.success(t('toasts.updatedSuccess'));
        setCreateDialogOpen(false);
      } else {
        const serverErrs = res.payload?.errors;
        if (serverErrs && Object.keys(serverErrs).length > 0) {
          Object.entries(serverErrs).forEach(([field, messages]) => {
            if (messages && messages.length > 0) {
              setError(field as keyof ReportFormValues, { type: 'server', message: messages[0] });
            }
          });
        }
        toast.error(res.payload?.message || t('errors.genericUpdate'));
      }
    } else {
      const reportNumberInt =
        parseInt(values.report_number || getNextReportNumber(values.report_type_id), 10) || 1;

      const res = await dispatch(
        createReport({
          report_type_id: parseInt(values.report_type_id, 10),
          title: values.title.trim(),
          report_number: reportNumberInt,
          content: values.content.trim(),
          due_at: values.due_at ? `${values.due_at} 23:59:59` : null,
          file_ids: fileIds,
        })
      );

      if (createReport.fulfilled.match(res)) {
        toast.success(t('toasts.createdSuccess'));
        setCreateDialogOpen(false);
      } else {
        const serverErrs = res.payload?.errors;
        if (serverErrs && Object.keys(serverErrs).length > 0) {
          Object.entries(serverErrs).forEach(([field, messages]) => {
            if (messages && messages.length > 0) {
              setError(field as keyof ReportFormValues, { type: 'server', message: messages[0] });
            }
          });
        }
        const errorCode = res.payload?.errorCode;
        let msg = res.payload?.message || t('errors.genericCreate');
        if (errorCode === 'training_completed') {
          msg = t('errors.trainingCompleted', {
            defaultValue: 'Your training is complete. No new reports can be created.',
          });
        } else if (errorCode === 'no_active_assignment') {
          msg = t('errors.noActiveAssignment');
        } else if (errorCode === 'report_type_not_allowed') {
          msg = t('errors.reportTypeNotAllowed', {
            defaultValue: 'This report type is not enabled for your training assignment.',
          });
        } else if (errorCode === 'report_quota_exceeded') {
          msg = t('errors.reportQuotaExceeded', {
            defaultValue:
              'You have reached the maximum allowed number of reports for this type or placement.',
          });
        } else if (errorCode === 'duplicate_report') {
          msg = t('errors.duplicateReport');
        } else if (errorCode === 'duplicate_final_report') {
          msg = t('errors.duplicateFinalReport');
        } else if (errorCode === 'report_sequence_not_met') {
          msg = t('errors.reportSequenceNotMet', {
            defaultValue:
              'You must complete and get approval for all prior-tier reports before creating this one.',
          });
        }
        toast.error(msg);
      }
    }
  };

  const isUploading = uploadingIds.size > 0;
  const isSaving = isCreating || isUpdating || isUploading || isSubmitting;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 md:p-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            {t('title')}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">{t('subtitle')}</p>
        </div>

        <Button
          onClick={handleOpenCreateDialog}
          disabled={
            isTrainingCompleted || (!isFetchingMyAssignment && !myAssignment) || isTotalQuotaReached
          }
          title={
            !isFetchingMyAssignment && !myAssignment
              ? t('noActiveAssignmentNotice', { defaultValue: 'No active training placement' })
              : isTrainingCompleted
                ? t('trainingCompletedDisabledHint', {
                    defaultValue: 'Training is complete — no new reports can be created',
                  })
                : isTotalQuotaReached
                  ? t('totalQuotaReachedNotice', {
                      defaultValue: 'All required reports for this placement have been created',
                    })
                  : undefined
          }
          className="gap-2 shrink-0 bg-[#5B50D6] hover:bg-[#4E44C4] text-white font-medium shadow-sm rounded-lg px-4 py-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
          {t('createReport')}
        </Button>
      </div>

      {/* Active Training Placement Context Card */}
      {myAssignment && (
        <Card className="border-border/60 shadow-xs bg-gradient-to-r from-blue-50/50 via-indigo-50/30 to-purple-50/20 dark:from-slate-900 dark:via-slate-900/80 dark:to-slate-900/60 overflow-hidden">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="h-11 w-11 rounded-xl bg-white dark:bg-slate-800 border border-border/50 shadow-xs flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5 text-[#5B50D6]" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100">
                      {resolveLocalizedText(myAssignment.opportunity?.title) ||
                        t('trainingProgram', { defaultValue: 'Training Program' })}
                    </h3>
                    <Badge
                      variant="outline"
                      className="text-xs font-normal border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                    >
                      {t(`status.${myAssignment.status}`, myAssignment.status)}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-1.5">
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {resolveLocalizedText(myAssignment.company?.name) ||
                        resolveLocalizedText(myAssignment.application?.opportunity?.company?.name)}
                    </span>
                    {myAssignment.academic_supervisor?.name && (
                      <>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1">
                          <GraduationCap className="h-3.5 w-3.5" />
                          {myAssignment.academic_supervisor.name}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Training dates & duration */}
              {(myAssignment.start_date || myAssignment.end_date) && (
                <div className="flex sm:flex-col sm:items-end justify-between text-xs text-muted-foreground shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground/80">
                    {t('trainingPeriod', { defaultValue: 'Training Period' })}
                  </span>
                  <span className="font-medium text-gray-800 dark:text-gray-200 mt-0.5">
                    {formatDate(myAssignment.start_date)} — {formatDate(myAssignment.end_date)}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notice if student has no active placement */}
      {!isFetchingMyAssignment && !myAssignment && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{t('noActiveAssignmentNotice')}</span>
        </div>
      )}

      {/* Training Completed Banner */}
      {isTrainingCompleted && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-700/60 px-4 py-3.5">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
              {t('trainingCompleted.title', { defaultValue: 'Training Complete 🎓' })}
            </p>
            <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
              {t('trainingCompleted.description', {
                defaultValue:
                  'Your final report has been approved. Your training is complete and no further reports can be created or submitted.',
              })}
            </p>
          </div>
        </div>
      )}

      {/* Loading state — shown while either reports or assignment are fetching */}
      {(isLoadingReports || isFetchingMyAssignment) && reports.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin mb-3 text-primary" />
          <p className="text-sm">{t('loading', { defaultValue: 'Loading...' })}</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoadingReports && !isFetchingMyAssignment && reports.length === 0 && (
        <Card className="border-dashed py-12 text-center shadow-none">
          <CardContent className="flex flex-col items-center justify-center space-y-3">
            <div className="rounded-full bg-muted p-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg text-foreground">{t('empty')}</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {!myAssignment ? t('noActiveAssignmentNotice') : t('emptyDescription')}
            </p>
            {myAssignment && !isTrainingCompleted && (
              <Button
                onClick={handleOpenCreateDialog}
                size="sm"
                className="mt-2 gap-1.5 bg-[#5B50D6] hover:bg-[#4E44C4] text-white cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                {t('createReport')}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Filter Bar */}
      {reports.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { key: 'all', label: t('all', { defaultValue: 'All' }) },
              { key: 'draft', label: t('status.draft') },
              { key: 'submitted', label: t('status.submitted') },
              { key: 'revision_requested', label: t('status.revision_requested') },
              { key: 'approved', label: t('status.approved') },
            ].map((st) => (
              <button
                key={st.key}
                type="button"
                onClick={() => setFilterStatus(st.key)}
                className={cn(
                  'px-3 py-1 text-xs rounded-full font-medium transition-colors cursor-pointer',
                  filterStatus === st.key
                    ? 'bg-[#5B50D6] text-white shadow-xs'
                    : 'bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                {st.label}
              </button>
            ))}
          </div>

          {/* Type Dropdown */}
          {reportTypes.length > 1 && (
            <div className="w-36 shrink-0">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="h-8 text-xs border-muted bg-background">
                  <SelectValue placeholder={t('filterType', { defaultValue: 'Report Type' })} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t('allTypes', { defaultValue: 'All Types' })}
                  </SelectItem>
                  {reportTypes.map((type) => (
                    <SelectItem key={type.id} value={String(type.id)}>
                      {getLocalizedName(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {/* Reports List */}
      <div className="space-y-4">
        {reports.length > 0 && visibleReports.length === 0 && (
          <p className="text-center py-10 text-sm text-muted-foreground">
            {t('noMatchingReports', { defaultValue: 'No reports match the selected filter.' })}
          </p>
        )}
        {visibleReports.map((report) => {
          const isOverdue =
            !report.submitted_at && Boolean(report.due_at) && new Date(report.due_at!) < new Date();
          const isEditable =
            report.status === 'draft' ||
            report.status === 'revision_requested' ||
            report.status === 'rejected';
          const isSubmittable =
            report.status === 'draft' ||
            report.status === 'revision_requested' ||
            report.status === 'rejected';
          const feedbackText = report.latest_review?.feedback || report.feedback;
          const typeName =
            getLocalizedName(report.report_type) ||
            (report.report_type?.code ? t(report.report_type.code) : '');

          return (
            <Card
              key={report.id}
              className="hover:shadow-md transition-shadow border border-gray-100 dark:border-gray-800 bg-white dark:bg-card rounded-xl overflow-hidden"
            >
              <CardContent className="p-5 md:p-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  {/* Report Details */}
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      {getStatusIcon(report.status, isOverdue)}
                      <h3 className="font-medium text-base md:text-lg text-gray-900 dark:text-gray-100">
                        {formatReportTitle(report)}
                      </h3>
                      {getStatusBadge(report.status, isOverdue)}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs md:text-sm text-gray-500 dark:text-gray-400">
                      {typeName && (
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5" />
                          <span>{typeName}</span>
                          {report.report_number && report.report_type?.code !== 'final' && (
                            <span>• {formatReportNumberLabel(report)}</span>
                          )}
                        </div>
                      )}

                      {report.due_at && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>
                            {t('dueDate')}: {formatDate(report.due_at)}
                          </span>
                        </div>
                      )}

                      {report.submitted_at && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>
                            {t('submissionDate')}: {formatDate(report.submitted_at)}
                          </span>
                        </div>
                      )}

                      {report.grade !== null && report.grade !== undefined && (
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            {t('grade')}:
                          </span>
                          <Badge variant="secondary" className="font-semibold text-xs">
                            {report.grade}/100
                          </Badge>
                        </div>
                      )}

                      {/* Attachment count indicator */}
                      {(report.files?.length ?? 0) > 0 && (
                        <div className="flex items-center gap-1.5">
                          <Paperclip className="h-3.5 w-3.5" />
                          <span>
                            {t('attachmentCount', {
                              count: report.files!.length,
                              defaultValue_one: '{{count}} attachment',
                              defaultValue_other: '{{count}} attachments',
                            })}
                          </span>
                        </div>
                      )}
                    </div>

                    {Boolean(feedbackText) && (
                      <FeedbackNote
                        text={feedbackText}
                        variant={
                          report.status === 'revision_requested'
                            ? 'revision'
                            : report.status === 'rejected'
                              ? 'rejected'
                              : 'default'
                        }
                        label={
                          report.status === 'revision_requested'
                            ? t('supervisorFeedback')
                            : report.status === 'rejected'
                              ? t('rejectionReason')
                              : t('feedback')
                        }
                      />
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap mt-3 md:mt-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenViewDialog(report)}
                      className="text-sm font-medium px-3.5 py-1.5 h-9 rounded-lg border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 cursor-pointer shadow-none"
                    >
                      <Eye className="h-4 w-4 me-1.5" />
                      {t('viewReport')}
                    </Button>

                    {isEditable && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEditDialog(report)}
                        className="text-sm font-medium px-3.5 py-1.5 h-9 rounded-lg border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 cursor-pointer shadow-none"
                      >
                        <FilePen className="h-4 w-4 me-1.5" />
                        {t('editReport')}
                      </Button>
                    )}

                    {isSubmittable && (
                      <Button
                        size="sm"
                        disabled={isTrainingCompleted}
                        title={
                          isTrainingCompleted
                            ? t('trainingCompletedDisabledHint', {
                                defaultValue:
                                  'Training is complete — no further submissions allowed',
                              })
                            : undefined
                        }
                        onClick={() => handleOpenConfirmSubmit(report)}
                        className="text-sm font-medium px-3.5 py-1.5 h-9 rounded-lg bg-[#5B50D6] hover:bg-[#4E44C4] text-white cursor-pointer shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send className="h-4 w-4 me-1.5" />
                        {report.status === 'revision_requested' || report.status === 'rejected'
                          ? t('resubmit')
                          : t('submit')}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingReport ? t('editReportTitle') : t('newReportTitle')}
            </DialogTitle>
            <DialogDescription className="sr-only">{t('formSubtitle')}</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 pt-2">
            {/* Prominent Supervisor Feedback Banner on Revision Requested / Rejected */}
            {editingReport?.status === 'revision_requested' &&
              Boolean(editingReport.latest_review?.feedback || editingReport.feedback) && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 space-y-1.5">
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>{t('supervisorFeedback')}</span>
                  </div>
                  <p className="text-xs md:text-sm whitespace-pre-wrap text-amber-950 dark:text-amber-100 bg-white/70 dark:bg-black/30 p-2.5 rounded border border-amber-200/60 dark:border-amber-900/40 max-h-40 overflow-y-auto">
                    {editingReport.latest_review?.feedback || editingReport.feedback}
                  </p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300">
                    {t('revisionRequestedNotice')}
                  </p>
                </div>
              )}
            {editingReport?.status === 'rejected' &&
              Boolean(editingReport.latest_review?.feedback || editingReport.feedback) && (
                <div className="p-4 bg-red-50 dark:bg-red-950/40 rounded-lg border border-red-200 dark:border-red-800/60 text-red-900 dark:text-red-200 space-y-1.5">
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
                    <span>{t('rejectionReason')}</span>
                  </div>
                  <p className="text-xs md:text-sm whitespace-pre-wrap text-red-950 dark:text-red-100 bg-white/70 dark:bg-black/30 p-2.5 rounded border border-red-200/60 dark:border-red-900/40 max-h-40 overflow-y-auto">
                    {editingReport.latest_review?.feedback || editingReport.feedback}
                  </p>
                  <p className="text-[11px] text-red-700 dark:text-red-300">
                    {t('rejectedNotice')}
                  </p>
                </div>
              )}

            {/* Title */}
            <div>
              <Label htmlFor="title" className="text-xs font-medium" required>
                {t('titleLabel')}
              </Label>
              <Input
                id="title"
                placeholder={t('titlePlaceholder')}
                aria-invalid={!!getFieldError('title')}
                className="mt-1"
                {...register('title', {
                  onChange: () => {
                    if (getFieldError('title')) clearErrors('title');
                  },
                })}
              />
              {getFieldError('title') && (
                <p className="text-xs text-destructive font-medium mt-1">
                  {getFieldError('title')}
                </p>
              )}
            </div>

            {/* Type + Due Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="report_type_id" className="text-xs font-medium" required>
                  {t('reportTypeLabel')}
                </Label>
                <Controller
                  control={control}
                  name="report_type_id"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(val) => {
                        field.onChange(val);
                        if (getFieldError('report_type_id')) clearErrors('report_type_id');
                        if (!editingReport) {
                          setValue('report_number', getNextReportNumber(val));
                        }
                      }}
                      disabled={Boolean(editingReport)}
                    >
                      <SelectTrigger
                        id="report_type_id"
                        aria-invalid={!!getFieldError('report_type_id')}
                        className="mt-1 w-full cursor-pointer"
                      >
                        <SelectValue placeholder={t('reportTypePlaceholder')}>
                          {field.value
                            ? (() => {
                                const found = reportTypes.find(
                                  (type) => String(type.id) === field.value
                                );
                                return found ? getLocalizedName(found) : t('reportTypePlaceholder');
                              })()
                            : t('reportTypePlaceholder')}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {allowedReportTypes.map((type) => {
                          const quota = getTypeQuotaInfo(type.code);
                          const isFinalAndAlreadyExists =
                            !editingReport && type.code === 'final' && hasExistingFinalReport;
                          const isQuotaReached = !editingReport && quota.isReached;
                          const sequenceGate = getSequenceGate(type.code);
                          const isSequenceBlocked = !editingReport && sequenceGate.isBlocked;
                          const isDisabled = isFinalAndAlreadyExists || isQuotaReached || isSequenceBlocked;
                          const prereqTypeName = sequenceGate.prereqType
                            ? getLocalizedName(
                                reportTypes.find((rt) => rt.code === sequenceGate.prereqType)
                              ) || sequenceGate.prereqType
                            : '';

                          return (
                            <SelectItem key={type.id} value={String(type.id)} disabled={isDisabled}>
                              <div className="flex items-center justify-between w-full gap-2">
                                <span>{getLocalizedName(type) || type.code}</span>
                                {quota.maxCount !== null &&
                                  !isFinalAndAlreadyExists &&
                                  !isQuotaReached &&
                                  !isSequenceBlocked && (
                                    <span className="text-[11px] text-muted-foreground font-normal">
                                      ({quota.count}/{quota.maxCount})
                                    </span>
                                  )}
                                {isQuotaReached && !isFinalAndAlreadyExists && (
                                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-normal">
                                    ({t('quotaLimitReached', { defaultValue: 'Quota reached' })}{' '}
                                    {quota.count}/{quota.maxCount})
                                  </span>
                                )}
                                {isFinalAndAlreadyExists && (
                                  <span className="text-[11px] text-muted-foreground font-normal">
                                    ({t('finalReportAlreadyCreated')})
                                  </span>
                                )}
                                {isSequenceBlocked && !isFinalAndAlreadyExists && (
                                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-normal">
                                    (
                                    {t('sequenceNotMet', {
                                      defaultValue: 'Requires {{required}} approved {{type}} first',
                                      required: sequenceGate.required,
                                      type: prereqTypeName,
                                    })}
                                    )
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  )}
                />
                {getFieldError('report_type_id') && (
                  <p className="text-xs text-destructive font-medium mt-1">
                    {getFieldError('report_type_id')}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="due_at" className="text-xs font-medium" required>
                  {t('dueAtLabel')}
                </Label>
                <Input
                  id="due_at"
                  type="date"
                  dir="ltr"
                  aria-invalid={!!getFieldError('due_at')}
                  className="mt-1 cursor-pointer"
                  {...register('due_at', {
                    onChange: () => {
                      if (getFieldError('due_at')) clearErrors('due_at');
                    },
                  })}
                />
                {getFieldError('due_at') && (
                  <p className="text-xs text-destructive font-medium mt-1">
                    {getFieldError('due_at')}
                  </p>
                )}
              </div>
            </div>

            {/* Content */}
            <div>
              <Label htmlFor="content" className="text-xs font-medium" required>
                {t('contentLabel')}
              </Label>
              <Textarea
                id="content"
                placeholder={t('contentPlaceholder')}
                rows={5}
                aria-invalid={!!getFieldError('content')}
                className="mt-1 resize-y"
                {...register('content', {
                  onChange: () => {
                    if (getFieldError('content')) clearErrors('content');
                  },
                })}
              />
              {getFieldError('content') && (
                <p className="text-xs text-destructive font-medium mt-1">
                  {getFieldError('content')}
                </p>
              )}
            </div>

            {/* Attachments */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">{t('attachFile')}</Label>

              {/* Attached file chips */}
              {attachments.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  {attachments.map((a) => {
                    const isUpl = uploadingIds.has(a.localId);
                    const name = a.kind === 'pending' ? a.file.name : a.original_name;
                    const size = a.kind === 'pending' ? a.file.size : a.size_bytes;

                    return (
                      <div
                        key={a.localId}
                        className="flex items-center gap-2 p-2 bg-muted/40 rounded-lg border border-border text-xs"
                      >
                        {isUpl ? (
                          <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
                        ) : (
                          <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <span className="font-medium text-foreground truncate max-w-50">
                          {name}
                        </span>
                        <span className="text-muted-foreground text-[11px] shrink-0">
                          ({formatBytes(size)})
                        </span>
                        {a.kind === 'uploaded' && (
                          <a
                            href={a.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ms-auto text-primary hover:underline text-[11px] shrink-0"
                          >
                            {t('common:view', 'View')}
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(a.localId)}
                          disabled={isUpl}
                          className="ms-1 text-muted-foreground hover:text-destructive p-0.5 rounded-full hover:bg-muted cursor-pointer disabled:opacity-50"
                          title={t('removeFile', 'Remove')}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add file button */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileInputChange}
                className="hidden"
                accept={ACCEPTED_TYPES}
                multiple
              />
              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2 text-foreground font-normal border-border cursor-pointer hover:bg-muted/50 rounded-lg px-3 py-2 text-sm shadow-none"
                >
                  <Upload className="h-4 w-4 text-foreground" />
                  {t('attachFile')}
                </Button>
                <span className="text-[11px] text-muted-foreground">
                  {t('attachmentHelp', 'Max 10MB per file • PDF, Word, Images, ZIP')}
                </span>
              </div>

              {attachmentError && (
                <p className="text-xs text-destructive font-medium flex items-center gap-1.5 mt-1.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{attachmentError}</span>
                </p>
              )}
            </div>

            {/* Footer buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2">
              <div>
                {editingReport &&
                  (editingReport.status === 'draft' ||
                    editingReport.status === 'revision_requested' ||
                    editingReport.status === 'rejected') && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleOpenConfirmSubmit(editingReport)}
                      disabled={isSaving}
                      className="gap-1.5 bg-[#5B50D6] hover:bg-[#4E44C4] text-white cursor-pointer rounded-lg px-4 w-full sm:w-auto"
                    >
                      <Send className="h-4 w-4" />
                      {editingReport.status === 'revision_requested' ||
                      editingReport.status === 'rejected'
                        ? t('resubmitReport')
                        : t('submitReport')}
                    </Button>
                  )}
              </div>
              <div className="flex justify-end gap-2 ms-auto w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCreateDialogOpen(false)}
                  disabled={isSaving}
                  className="rounded-lg px-4"
                >
                  {t('cancel')}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSaving}
                  className="gap-1.5 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white cursor-pointer rounded-lg px-5"
                >
                  {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingReport ? t('submitUpdate') : t('submitCreate', 'Save Draft')}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Report Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="ltr:pr-12 rtl:pl-12">
            <div className="flex items-center gap-2 flex-wrap">
              <DialogTitle className="text-lg md:text-xl">
                {formatReportTitle(selectedReport)}
              </DialogTitle>
              {selectedReport &&
                getStatusBadge(
                  selectedReport.status,
                  !selectedReport.submitted_at &&
                    Boolean(selectedReport.due_at) &&
                    new Date(selectedReport.due_at!) < new Date()
                )}
            </div>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-muted/40 rounded-lg text-xs">
                <div>
                  <span className="text-muted-foreground block">{t('reportTypeLabel')}</span>
                  <span className="font-medium text-foreground">
                    {getLocalizedName(selectedReport.report_type) ||
                      selectedReport.report_type?.code ||
                      '—'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">{t('reportNumberLabel')}</span>
                  <span className="font-medium text-foreground">
                    {formatReportNumberLabel(selectedReport) || '—'}
                  </span>
                </div>
                {selectedReport.grade !== null && selectedReport.grade !== undefined && (
                  <div>
                    <span className="text-muted-foreground block">{t('grade')}</span>
                    <span className="font-semibold text-primary">{selectedReport.grade} / 100</span>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground block">{t('dueDate')}</span>
                  <span className="font-medium text-foreground">
                    {formatDate(selectedReport.due_at)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">{t('submissionDate')}</span>
                  <span className="font-medium text-foreground">
                    {formatDate(selectedReport.submitted_at)}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  {t('contentLabel')}
                </h4>
                <div className="p-4 rounded-md border bg-card text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {selectedReport.content}
                </div>
              </div>

              {/* Attachments in view dialog */}
              {(selectedReport.files?.length ?? 0) > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    {t('attachFile')}
                  </h4>
                  <div className="flex flex-col gap-1.5">
                    {selectedReport.files!.map((file) => (
                      <a
                        key={file.id}
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 bg-muted/40 rounded-lg border border-border text-xs hover:bg-muted/70 transition-colors group"
                      >
                        <Paperclip className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium text-foreground truncate flex-1">
                          {file.original_name}
                        </span>
                        <span className="text-muted-foreground shrink-0">
                          {formatBytes(file.size_bytes)}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {Boolean(selectedReport.latest_review?.feedback || selectedReport.feedback) && (
                <FeedbackNote
                  text={selectedReport.latest_review?.feedback || selectedReport.feedback || ''}
                  variant={
                    selectedReport.status === 'revision_requested'
                      ? 'revision'
                      : selectedReport.status === 'rejected'
                        ? 'rejected'
                        : 'default'
                  }
                  label={
                    selectedReport.status === 'revision_requested'
                      ? t('supervisorFeedback')
                      : selectedReport.status === 'rejected'
                        ? t('rejectionReason')
                        : t('feedback')
                  }
                />
              )}

              <div className="flex items-center justify-between pt-2">
                <div>
                  {(selectedReport.status === 'draft' ||
                    selectedReport.status === 'revision_requested' ||
                    selectedReport.status === 'rejected') && (
                    <Button
                      size="sm"
                      disabled={isTrainingCompleted}
                      title={
                        isTrainingCompleted
                          ? t('trainingCompletedDisabledHint', {
                              defaultValue: 'Training is complete — no reports can be submitted',
                            })
                          : undefined
                      }
                      onClick={() => handleOpenConfirmSubmit(selectedReport)}
                      className="gap-1.5 bg-[#5B50D6] hover:bg-[#4E44C4] text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="h-4 w-4" />
                      {selectedReport.status === 'revision_requested' ||
                      selectedReport.status === 'rejected'
                        ? t('resubmitReport')
                        : t('submitReport')}
                    </Button>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={() => setViewDialogOpen(false)}>
                  {t('common:close', 'إغلاق')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Submit Confirmation Dialog */}
      <Dialog open={confirmSubmitOpen} onOpenChange={setConfirmSubmitOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Send className="h-5 w-5 text-[#5B50D6]" />
              {reportToSubmit?.status === 'revision_requested' || reportToSubmit?.status === 'rejected'
                ? t('resubmitConfirmTitle')
                : t('submitConfirmTitle')}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground pt-1">
              {reportToSubmit?.status === 'revision_requested' || reportToSubmit?.status === 'rejected'
                ? t('resubmitConfirmDescription')
                : t('submitConfirmDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5 my-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <span>{t('submitLockNotice')}</span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setConfirmSubmitOpen(false);
                setReportToSubmit(null);
              }}
              disabled={isSubmitting}
              className="rounded-lg px-4"
            >
              {t('cancel')}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmSubmit}
              disabled={isSubmitting}
              className="gap-1.5 bg-[#5B50D6] hover:bg-[#4E44C4] text-white cursor-pointer rounded-lg px-4"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {reportToSubmit?.status === 'revision_requested' || reportToSubmit?.status === 'rejected'
                ? t('confirmResubmit')
                : t('confirmSubmit')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentReportsPage;