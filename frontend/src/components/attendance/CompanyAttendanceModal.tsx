import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  fetchAssignmentAttendance,
  recordAttendance,
  clearRecordErrors,
} from '@/store/slices/attendanceSlice';
import type { TrainingAssignmentItem } from '@/types/trainingAssignment';
import type { AttendanceStatus } from '@/types/attendance';
import { AttendanceSummaryStats } from './AttendanceSummaryStats';
import { useToast } from '@/context/ToastContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import {
  CalendarCheck,
  CalendarX,
  Clock,
  FileText,
  Loader2,
  Calendar,
  AlertCircle,
  PlusCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompanyAttendanceModalProps {
  assignment: TrainingAssignmentItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CompanyAttendanceModal: React.FC<CompanyAttendanceModalProps> = ({
  assignment,
  open,
  onOpenChange,
}) => {
  const { t, i18n } = useTranslation(['attendance', 'common']);
  const isRTL = i18n.language === 'ar';
  const toast = useToast();
  const dispatch = useAppDispatch();

  const {
    records = [],
    summary = null,
    isFetching = false,
    isRecording = false,
  } = useAppSelector((state) => state.attendance || {});

  const todayStr = new Date().toISOString().slice(0, 10);
  const [attendanceDate, setAttendanceDate] = useState<string>(todayStr);
  const [status, setStatus] = useState<AttendanceStatus>('present');
  const [reason, setReason] = useState<string>('');
  const [showForm, setShowForm] = useState<boolean>(false);
  const [formErrors, setFormErrors] = useState<{
    reason?: string;
    date?: string;
    general?: string;
  }>({});

  const resetForm = () => {
    setAttendanceDate(new Date().toISOString().slice(0, 10));
    setStatus('present');
    setReason('');
    setFormErrors({});
    setShowForm(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm();
    }
    onOpenChange(isOpen);
  };

  useEffect(() => {
    if (open && assignment) {
      dispatch(fetchAssignmentAttendance({ assignmentId: assignment.id }));
      dispatch(clearRecordErrors());
    }
  }, [open, assignment, dispatch]);

  if (!assignment) return null;

  const studentName = assignment.student_profile?.user?.name || '—';
  const studentNumber = assignment.student_profile?.student_number || '—';

  const handleRecord = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: { reason?: string; date?: string; general?: string } = {};

    if (!attendanceDate) {
      errors.date = t('dateRequired', 'التاريخ مطلوب');
    }

    if (status !== 'present' && !reason.trim()) {
      errors.reason = t('reasonRequired');
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});

    const resultAction = await dispatch(
      recordAttendance({
        assignmentId: assignment.id,
        payload: {
          attendance_date: attendanceDate,
          status,
          reason: status !== 'present' ? reason.trim() : null,
        },
      })
    );

    if (recordAttendance.fulfilled.match(resultAction)) {
      toast.success(t('toasts.recordedSuccess'));
      resetForm();
      // Re-fetch to guarantee sync with server
      dispatch(fetchAssignmentAttendance({ assignmentId: assignment.id }));
    } else {
      const err = resultAction.payload;
      if (err?.errorCode === 'attendance_already_recorded') {
        setFormErrors({ general: t('toasts.duplicateError') });
      } else if (err?.errorCode === 'assignment_not_active') {
        setFormErrors({ general: t('toasts.notActiveError') });
      } else {
        setFormErrors({ general: err?.message || t('toasts.duplicateError') });
      }
    }
  };

  const getStatusBadge = (recStatus: AttendanceStatus) => {
    switch (recStatus) {
      case 'present':
        return (
          <Badge
            variant="outline"
            className="bg-green-100 text-green-800 border-green-200 dark:bg-green-950/40 dark:text-green-300 gap-1 text-xs"
          >
            <CalendarCheck className="w-3 h-3" />
            {t('present')}
          </Badge>
        );
      case 'absent':
        return (
          <Badge
            variant="outline"
            className="bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 gap-1 text-xs"
          >
            <CalendarX className="w-3 h-3" />
            {t('absent')}
          </Badge>
        );
      case 'late':
        return (
          <Badge
            variant="outline"
            className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 gap-1 text-xs"
          >
            <Clock className="w-3 h-3" />
            {t('late')}
          </Badge>
        );
      case 'excused':
        return (
          <Badge
            variant="outline"
            className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 gap-1 text-xs"
          >
            <FileText className="w-3 h-3" />
            {t('excused')}
          </Badge>
        );
    }
  };

  const getApprovalBadge = (appStatus: string) => {
    switch (appStatus) {
      case 'approved':
        return (
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300 text-xs"
          >
            {t('approved')}
          </Badge>
        );
      case 'rejected':
        return (
          <Badge
            variant="outline"
            className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300 text-xs"
          >
            {t('rejected')}
          </Badge>
        );
      case 'pending':
      default:
        return (
          <Badge
            variant="outline"
            className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-300 text-xs"
          >
            {t('pending')}
          </Badge>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ltr:pr-10 rtl:pl-10">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                {t('title')} — {studentName}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {studentNumber} • {t('subtitle')}
              </DialogDescription>
            </div>
            {assignment.status === 'active' && (
              <Button
                size="sm"
                variant={showForm ? 'outline' : 'default'}
                className="gap-1.5 cursor-pointer text-xs shrink-0"
                onClick={() => setShowForm(!showForm)}
              >
                <PlusCircle className="w-4 h-4" />
                {showForm ? t('cancel') : t('recordAttendance')}
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Summary Statistics */}
          <AttendanceSummaryStats summary={summary} />

          {/* Record Attendance Day-Marking Form */}
          {showForm && (
            <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <CalendarCheck className="w-4 h-4 text-indigo-600" />
                {t('recordAttendance')}
              </h3>

              <form onSubmit={handleRecord} className="space-y-4">
                {formErrors.general && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formErrors.general}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Date Input */}
                  <div>
                    <Label htmlFor="attendance-date" className="text-xs">
                      {t('attendanceDate')}
                    </Label>
                    <Input
                      id="attendance-date"
                      type="date"
                      max={todayStr}
                      value={attendanceDate}
                      onChange={(e) => {
                        setAttendanceDate(e.target.value);
                        if (formErrors.date || formErrors.general) {
                          setFormErrors((prev) => ({
                            ...prev,
                            date: undefined,
                            general: undefined,
                          }));
                        }
                      }}
                      className={cn(
                        'mt-1 h-9 text-xs bg-surface',
                        formErrors.date && 'border-destructive focus-visible:ring-destructive'
                      )}
                    />
                    {formErrors.date && (
                      <p className="text-xs text-destructive font-medium mt-1">{formErrors.date}</p>
                    )}
                  </div>

                  {/* Status Selection Buttons */}
                  <div>
                    <Label className="text-xs mb-1 block">{t('statusLabel')}</Label>
                    <div className="grid grid-cols-4 gap-1.5 mt-1">
                      <Button
                        type="button"
                        size="sm"
                        variant={status === 'present' ? 'default' : 'outline'}
                        className={cn(
                          'h-9 px-2 text-xs cursor-pointer gap-1',
                          status === 'present'
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'border-green-300 hover:bg-green-50 dark:border-green-900'
                        )}
                        onClick={() => {
                          setStatus('present');
                          if (formErrors.reason) {
                            setFormErrors((prev) => ({ ...prev, reason: undefined }));
                          }
                        }}
                      >
                        <CalendarCheck className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{t('present')}</span>
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant={status === 'absent' ? 'default' : 'outline'}
                        className={cn(
                          'h-9 px-2 text-xs cursor-pointer gap-1',
                          status === 'absent'
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : 'border-red-300 hover:bg-red-50 dark:border-red-900'
                        )}
                        onClick={() => setStatus('absent')}
                      >
                        <CalendarX className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{t('absent')}</span>
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant={status === 'late' ? 'default' : 'outline'}
                        className={cn(
                          'h-9 px-2 text-xs cursor-pointer gap-1',
                          status === 'late'
                            ? 'bg-amber-600 hover:bg-amber-700 text-white'
                            : 'border-amber-300 hover:bg-amber-50 dark:border-amber-900'
                        )}
                        onClick={() => setStatus('late')}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{t('late')}</span>
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant={status === 'excused' ? 'default' : 'outline'}
                        className={cn(
                          'h-9 px-2 text-xs cursor-pointer gap-1',
                          status === 'excused'
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'border-blue-300 hover:bg-blue-50 dark:border-blue-900'
                        )}
                        onClick={() => setStatus('excused')}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{t('excused')}</span>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Reason (Conditional for non-present) */}
                {status !== 'present' && (
                  <div>
                    <Label htmlFor="attendance-reason" className="text-xs">
                      {t('reason')} <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="attendance-reason"
                      value={reason}
                      onChange={(e) => {
                        setReason(e.target.value);
                        if (formErrors.reason || formErrors.general) {
                          setFormErrors((prev) => ({
                            ...prev,
                            reason: undefined,
                            general: undefined,
                          }));
                        }
                      }}
                      placeholder={t('reasonPlaceholder')}
                      maxLength={500}
                      className={cn(
                        'mt-1 min-h-20 text-xs bg-surface',
                        formErrors.reason && 'border-destructive focus-visible:ring-destructive'
                      )}
                      aria-invalid={Boolean(formErrors.reason)}
                    />
                    {formErrors.reason && (
                      <p className="text-xs text-destructive font-medium mt-1">
                        {formErrors.reason}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="cursor-pointer text-xs"
                    onClick={() => setShowForm(false)}
                  >
                    {t('cancel')}
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isRecording}
                    className="cursor-pointer text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                  >
                    {isRecording ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        {t('recording')}
                      </>
                    ) : (
                      <>
                        <CalendarCheck className="w-3.5 h-3.5" />
                        {t('submitRecord')}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          )}

          <Separator />

          {/* Records Table */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center justify-between">
              <span>
                {t('attendanceRecords')} ({records.length})
              </span>
            </h3>

            {isFetching ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-xs">{t('common:loading')}</span>
              </div>
            ) : records.length === 0 ? (
              <div className="text-center py-10 border border-dashed rounded-lg">
                <AlertCircle className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">{t('noRecords')}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t('noRecordsDescription')}</p>
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-start">{t('attendanceDate')}</TableHead>
                      <TableHead className="text-start">{t('status')}</TableHead>
                      <TableHead className="text-start">{t('reason')}</TableHead>
                      <TableHead className="text-start">{t('approvalStatus')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((rec) => (
                      <TableRow key={rec.id}>
                        <TableCell className="font-mono text-xs whitespace-nowrap">
                          <span dir="ltr">{rec.attendance_date}</span>
                        </TableCell>
                        <TableCell>{getStatusBadge(rec.status)}</TableCell>
                        <TableCell className="text-xs max-w-xs truncate text-muted-foreground">
                          {rec.reason || '—'}
                        </TableCell>
                        <TableCell>{getApprovalBadge(rec.approval_status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CompanyAttendanceModal;
