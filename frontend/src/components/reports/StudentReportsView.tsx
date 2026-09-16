import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '@/store';
import { fetchReportTypes } from '@/store/slices/lookupSlice';
import { createReport, updateReport, clearReportErrors } from '@/store/slices/reportSlice';
import type { ReportItem, ReportStatus } from '@/types/reports';
import { useToast } from '@/context/ToastContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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
  FilePlus2,
  FilePen,
  Send,
  Eye,
  CheckCircle2,
  RotateCcw,
  XCircle,
  Loader2,
  AlertCircle,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StudentReportsViewProps {
  assignmentId: number;
}

interface ReportFormState {
  reportTypeId: string;
  title: string;
  reportNumber: string;
  content: string;
  dueAt: string;
}

const emptyForm: ReportFormState = {
  reportTypeId: '',
  title: '',
  reportNumber: '',
  content: '',
  dueAt: '',
};

/**
 * TEP-675 — student-facing "create / edit report draft" UI.
 *
 * Rendered inside the student's MyPlacementView, right after
 * StudentAttendanceView, following the same "own card, own slice, own
 * i18n namespace" pattern already used for attendance.
 *
 * FLAGGED / scope note: the list below only shows reports created or
 * edited during this browser session — see reportSlice.ts's docblock.
 * There is no GET /api/v1/reports (list-own-reports) endpoint in this
 * sprint's board to persist/restore it across page loads; that is a
 * separate, later ticket. The "Attach file" affordance from the design
 * prototype was intentionally left out for the same reason — TEP-674
 * does not define a report-attachment endpoint.
 */
export const StudentReportsView: React.FC<StudentReportsViewProps> = ({ assignmentId }) => {
  const { t, i18n } = useTranslation(['reports', 'common']);
  const isRTL = i18n.language === 'ar';
  const toast = useToast();
  const dispatch = useAppDispatch();

  const { reportTypes = [], isLoadingReportTypes = false } = useAppSelector(
    (state) => state.lookup || {}
  );
  const {
    reports = [],
    isCreating = false,
    isUpdating = false,
  } = useAppSelector((state) => state.reports || {});

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<ReportItem | null>(null);
  const [form, setForm] = useState<ReportFormState>(emptyForm);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ReportFormState, string>>>({});

  useEffect(() => {
    if (reportTypes.length === 0 && !isLoadingReportTypes) {
      dispatch(fetchReportTypes());
    }
  }, [dispatch, reportTypes.length, isLoadingReportTypes]);

  const assignmentReports = useMemo(
    () => reports.filter((r) => r.training_assignment_id === assignmentId),
    [reports, assignmentId]
  );

  const getLocalizedName = useCallback(
    (item: { name: unknown } | undefined | null) => {
      if (!item) return '';
      if (typeof item.name === 'string') return item.name;
      if (typeof item.name === 'object' && item.name !== null) {
        const loc = item.name as Record<string, string>;
        return isRTL ? loc.ar || loc.en || '' : loc.en || loc.ar || '';
      }
      return '';
    },
    [isRTL]
  );

  const resetForm = () => {
    setForm(emptyForm);
    setFormErrors({});
    setEditingReport(null);
  };

  const openCreateDialog = () => {
    resetForm();
    dispatch(clearReportErrors());
    setDialogOpen(true);
  };

  const openEditDialog = (report: ReportItem) => {
    setEditingReport(report);
    setForm({
      reportTypeId: String(report.report_type_id),
      title: report.title,
      reportNumber: String(report.report_number),
      content: report.content,
      dueAt: report.due_at ? report.due_at.slice(0, 10) : '',
    });
    setFormErrors({});
    dispatch(clearReportErrors());
    setDialogOpen(true);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) resetForm();
    setDialogOpen(open);
  };

  const isReadOnly = editingReport !== null && editingReport.status !== 'draft';

  const validate = (): boolean => {
    const errors: Partial<Record<keyof ReportFormState, string>> = {};

    if (!form.reportTypeId) errors.reportTypeId = t('validation.reportTypeRequired');
    if (!form.title.trim()) errors.title = t('validation.titleRequired');

    const numberValue = Number(form.reportNumber);
    if (!form.reportNumber || !Number.isInteger(numberValue) || numberValue < 1) {
      errors.reportNumber = t('validation.reportNumberInvalid');
    }

    if (!form.content.trim()) errors.content = t('validation.contentRequired');

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (isReadOnly) return;
    if (!validate()) return;

    const payload = {
      report_type_id: Number(form.reportTypeId),
      title: form.title.trim(),
      report_number: Number(form.reportNumber),
      content: form.content.trim(),
      due_at: form.dueAt || null,
    };

    if (editingReport) {
      const resultAction = await dispatch(updateReport({ reportId: editingReport.id, payload }));
      if (updateReport.fulfilled.match(resultAction)) {
        toast.success(t('toasts.updatedSuccess'));
        handleOpenChange(false);
      } else {
        toast.error(resolveErrorMessage(resultAction.payload?.errorCode, 'update'));
      }
    } else {
      const resultAction = await dispatch(createReport(payload));
      if (createReport.fulfilled.match(resultAction)) {
        toast.success(t('toasts.createdSuccess'));
        handleOpenChange(false);
      } else {
        toast.error(resolveErrorMessage(resultAction.payload?.errorCode, 'create'));
      }
    }
  };

  const resolveErrorMessage = (
    errorCode: string | null | undefined,
    action: 'create' | 'update'
  ) => {
    switch (errorCode) {
      case 'no_active_assignment':
        return t('errors.noActiveAssignment');
      case 'duplicate_report':
        return t('errors.duplicateReport');
      case 'report_not_editable':
        return t('errors.notEditable');
      default:
        return action === 'create' ? t('errors.genericCreate') : t('errors.genericUpdate');
    }
  };

  const getStatusBadge = (status: ReportStatus) => {
    const common = 'gap-1 text-xs';
    switch (status) {
      case 'draft':
        return (
          <Badge
            variant="outline"
            className={cn(
              common,
              'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300'
            )}
          >
            <FilePen className="w-3 h-3" />
            {t('status.draft')}
          </Badge>
        );
      case 'submitted':
        return (
          <Badge
            variant="outline"
            className={cn(
              common,
              'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300'
            )}
          >
            <Send className="w-3 h-3" />
            {t('status.submitted')}
          </Badge>
        );
      case 'under_review':
        return (
          <Badge
            variant="outline"
            className={cn(
              common,
              'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
            )}
          >
            <Eye className="w-3 h-3" />
            {t('status.under_review')}
          </Badge>
        );
      case 'approved':
        return (
          <Badge
            variant="outline"
            className={cn(
              common,
              'bg-green-100 text-green-800 border-green-200 dark:bg-green-950/40 dark:text-green-300'
            )}
          >
            <CheckCircle2 className="w-3 h-3" />
            {t('status.approved')}
          </Badge>
        );
      case 'revision_requested':
        return (
          <Badge
            variant="outline"
            className={cn(
              common,
              'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300'
            )}
          >
            <RotateCcw className="w-3 h-3" />
            {t('status.revision_requested')}
          </Badge>
        );
      case 'rejected':
        return (
          <Badge
            variant="outline"
            className={cn(
              common,
              'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300'
            )}
          >
            <XCircle className="w-3 h-3" />
            {t('status.rejected')}
          </Badge>
        );
      default:
        return null;
    }
  };

  const isSaving = isCreating || isUpdating;

  return (
    <>
      <Card className="border-border/60 shadow-sm mt-6">
        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            {t('heading')}
          </CardTitle>
          <Button size="sm" className="cursor-pointer gap-1.5 text-xs" onClick={openCreateDialog}>
            <FilePlus2 className="w-3.5 h-3.5" />
            {t('newReport')}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {assignmentReports.length === 0 ? (
            <div className="text-center py-8 border border-dashed rounded-lg">
              <AlertCircle className="w-7 h-7 text-muted-foreground/50 mx-auto mb-1.5" />
              <p className="text-xs font-medium text-foreground">{t('empty')}</p>
              <p className="text-[11px] text-muted-foreground">{t('emptyDescription')}</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {assignmentReports.map((report) => (
                <li
                  key={report.id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {report.title}
                      </span>
                      {getStatusBadge(report.status)}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {report.report_type ? getLocalizedName(report.report_type) : ''}
                      {' • '}
                      {t('reportNumberShort', { number: report.report_number })}
                    </p>
                  </div>
                  {report.status === 'draft' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="cursor-pointer text-xs shrink-0"
                      onClick={() => openEditDialog(report)}
                    >
                      {t('edit')}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-lg" dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              {editingReport ? t('editReportTitle') : t('newReportTitle')}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {isReadOnly ? t('readOnlyNotice') : t('formSubtitle')}
            </DialogDescription>
          </DialogHeader>

          {isReadOnly && (
            <div className="flex items-center gap-2 rounded-md border border-dashed p-2.5 text-xs text-muted-foreground">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              {t('readOnlyNotice')}
            </div>
          )}

          <div className="space-y-4 pt-1">
            <div>
              <Label htmlFor="report-type" required>
                {t('reportTypeLabel')}
              </Label>
              <Select
                value={form.reportTypeId}
                onValueChange={(val) => {
                  setForm((f) => ({ ...f, reportTypeId: val }));
                  if (formErrors.reportTypeId) {
                    setFormErrors((e) => ({ ...e, reportTypeId: undefined }));
                  }
                }}
                disabled={isReadOnly}
              >
                <SelectTrigger
                  id="report-type"
                  aria-invalid={Boolean(formErrors.reportTypeId)}
                  className="mt-1 cursor-pointer"
                >
                  <SelectValue placeholder={t('reportTypePlaceholder')}>
                    {form.reportTypeId
                      ? getLocalizedName(
                          reportTypes.find((rt) => String(rt.id) === form.reportTypeId)
                        )
                      : t('reportTypePlaceholder')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {reportTypes.map((rt) => (
                    <SelectItem key={rt.id} value={String(rt.id)} className="cursor-pointer">
                      {getLocalizedName(rt)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.reportTypeId && (
                <p className="text-xs text-destructive font-medium mt-1">
                  {formErrors.reportTypeId}
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label htmlFor="report-title" required>
                  {t('titleLabel')}
                </Label>
                <Input
                  id="report-title"
                  value={form.title}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, title: e.target.value }));
                    if (formErrors.title) setFormErrors((err) => ({ ...err, title: undefined }));
                  }}
                  placeholder={t('titlePlaceholder')}
                  maxLength={255}
                  disabled={isReadOnly}
                  error={formErrors.title}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="report-number" required>
                  {t('reportNumberLabel')}
                </Label>
                <Input
                  id="report-number"
                  type="number"
                  min={1}
                  value={form.reportNumber}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, reportNumber: e.target.value }));
                    if (formErrors.reportNumber) {
                      setFormErrors((err) => ({ ...err, reportNumber: undefined }));
                    }
                  }}
                  disabled={isReadOnly}
                  error={formErrors.reportNumber}
                  className="mt-1"
                />
              </div>
            </div>
            {(formErrors.title || formErrors.reportNumber) && (
              <div className="-mt-2 flex justify-between text-xs text-destructive font-medium">
                <span>{formErrors.title}</span>
                <span>{formErrors.reportNumber}</span>
              </div>
            )}

            <div>
              <Label htmlFor="report-content" required>
                {t('contentLabel')}
              </Label>
              <Textarea
                id="report-content"
                value={form.content}
                onChange={(e) => {
                  setForm((f) => ({ ...f, content: e.target.value }));
                  if (formErrors.content) {
                    setFormErrors((err) => ({ ...err, content: undefined }));
                  }
                }}
                placeholder={t('contentPlaceholder')}
                className={cn(
                  'mt-1 min-h-32 text-sm',
                  formErrors.content && 'border-destructive focus-visible:ring-destructive'
                )}
                disabled={isReadOnly}
                aria-invalid={Boolean(formErrors.content)}
              />
              {formErrors.content && (
                <p className="text-xs text-destructive font-medium mt-1">{formErrors.content}</p>
              )}
            </div>

            <div>
              <Label htmlFor="report-due-at">{t('dueAtLabel')}</Label>
              <Input
                id="report-due-at"
                type="date"
                value={form.dueAt}
                onChange={(e) => setForm((f) => ({ ...f, dueAt: e.target.value }))}
                disabled={isReadOnly}
                className="mt-1"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer text-xs"
                onClick={() => handleOpenChange(false)}
              >
                {t('cancel')}
              </Button>
              {!isReadOnly && (
                <Button
                  size="sm"
                  disabled={isSaving}
                  onClick={handleSubmit}
                  className="cursor-pointer text-xs gap-1.5"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      {t('saving')}
                    </>
                  ) : editingReport ? (
                    t('submitUpdate')
                  ) : (
                    t('submitCreate')
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default StudentReportsView;
