import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  fetchAssignmentAttendance,
  approveAttendanceRecord,
  rejectAttendanceRecord,
} from '@/store/slices/attendanceSlice';
import type { TrainingAssignmentItem } from '@/types/trainingAssignment';
import type { AttendanceRecordItem, AttendanceStatus } from '@/types/attendance';
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
  Check,
  X,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SupervisorAttendanceModalProps {
  assignment: TrainingAssignmentItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SupervisorAttendanceModal: React.FC<SupervisorAttendanceModalProps> = ({
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
    isApproving = false,
    isRejecting = false,
  } = useAppSelector((state) => state.attendance || {});

  const [rejectingRecord, setRejectingRecord] = useState<AttendanceRecordItem | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [rejectError, setRejectError] = useState<string | null>(null);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setRejectingRecord(null);
      setRejectReason('');
      setRejectError(null);
    }
    onOpenChange(isOpen);
  };

  useEffect(() => {
    if (open && assignment) {
      dispatch(fetchAssignmentAttendance({ assignmentId: assignment.id }));
    }
  }, [open, assignment, dispatch]);

  if (!assignment) return null;

  const studentName = assignment.student_profile?.user?.name || '—';
  const studentNumber = assignment.student_profile?.student_number || '—';

  const handleApprove = async (record: AttendanceRecordItem) => {
    const resultAction = await dispatch(approveAttendanceRecord(record.id));
    if (approveAttendanceRecord.fulfilled.match(resultAction)) {
      toast.success(t('toasts.approvedSuccess'));
    } else {
      toast.error(resultAction.payload || 'Failed to approve attendance');
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingRecord) return;
    if (!rejectReason.trim() || rejectReason.trim().length < 3) {
      setRejectError(t('reasonRequired'));
      return;
    }

    setRejectError(null);

    const resultAction = await dispatch(
      rejectAttendanceRecord({
        recordId: rejectingRecord.id,
        reason: rejectReason.trim(),
      })
    );

    if (rejectAttendanceRecord.fulfilled.match(resultAction)) {
      toast.success(t('toasts.rejectedSuccess'));
      setRejectingRecord(null);
      setRejectReason('');
      setRejectError(null);
    } else {
      setRejectError(resultAction.payload || 'Failed to reject attendance');
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
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="max-w-4xl max-h-[90vh] overflow-y-auto"
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          <DialogHeader className="ltr:pr-10 rtl:pl-10">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              {t('title')} — {studentName}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              {studentNumber} • {t('subtitle')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 pt-2">
            {/* Summary Statistics */}
            <AttendanceSummaryStats summary={summary} />

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
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t('noRecordsDescription')}
                  </p>
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
                        <TableHead className="text-start">{t('actions')}</TableHead>
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
                          <TableCell>
                            {rec.approval_status === 'pending' ? (
                              <div className="flex items-center gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={isApproving}
                                  className="h-7 px-2 text-xs text-green-700 hover:text-green-800 hover:bg-green-50 dark:hover:bg-green-950/30 border-green-300 dark:border-green-800 cursor-pointer gap-1"
                                  onClick={() => handleApprove(rec)}
                                  title={t('approve')}
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">{t('approve')}</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={isRejecting}
                                  className="h-7 px-2 text-xs text-red-700 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-300 dark:border-red-800 cursor-pointer gap-1"
                                  onClick={() => {
                                    setRejectingRecord(rec);
                                    setRejectReason('');
                                    setRejectError(null);
                                  }}
                                  title={t('reject')}
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">{t('reject')}</span>
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
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

      {/* Rejection Dialog */}
      <Dialog
        open={Boolean(rejectingRecord)}
        onOpenChange={(open) => !open && setRejectingRecord(null)}
      >
        <DialogContent dir={isRTL ? 'rtl' : 'ltr'} className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <CalendarX className="w-5 h-5 text-red-600" />
              {t('rejectAttendanceTitle')}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              {t('rejectAttendanceDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <Label htmlFor="reject-reason" className="text-xs">
                {t('rejectionReason')} <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => {
                  setRejectReason(e.target.value);
                  if (rejectError) setRejectError(null);
                }}
                placeholder={t('rejectionReasonPlaceholder')}
                maxLength={1000}
                className={cn(
                  'mt-1 min-h-24 text-xs',
                  rejectError && 'border-destructive focus-visible:ring-destructive'
                )}
                aria-invalid={Boolean(rejectError)}
              />
              {rejectError && (
                <p className="text-xs text-destructive font-medium mt-1">{rejectError}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer text-xs"
                onClick={() => {
                  setRejectingRecord(null);
                  setRejectError(null);
                }}
              >
                {t('cancel')}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={isRejecting || rejectReason.trim().length < 3}
                onClick={handleConfirmReject}
                className="cursor-pointer text-xs gap-1.5"
              >
                {isRejecting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    {t('rejecting')}
                  </>
                ) : (
                  <>
                    <X className="w-3.5 h-3.5" />
                    {t('confirmReject')}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SupervisorAttendanceModal;
