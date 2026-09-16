import React, { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '@/store';
import { scheduleInterview, clearScheduleInterviewError } from '@/store/slices/applicationSlice';
import { useToast } from '@/context/ToastContext';
import type { ApplicationItem } from '@/types/application';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Loader2 } from 'lucide-react';

interface ScheduleInterviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  application: ApplicationItem | null;
  onSuccess?: () => void;
}

// ── datetime-local <-> ISO helpers ──────────────────────────────────────────
// <input type="datetime-local"> works in the browser's local time, in the
// "YYYY-MM-DDTHH:mm" shape (no seconds, no timezone offset). We convert to/
// from a real ISO datetime (what the backend's `interview_at` field expects)
// at the boundary, rather than storing the raw local string anywhere.
function toDatetimeLocalValue(isoOrDate: string | Date): string {
  const date = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDatetimeLocalValue(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

/**
 * TEP-654 — Schedule Interview dialog.
 *
 * Triggered from the "Schedule Interview" action on CompanyApplicationsPage's
 * list (TEP-645). Slots into the same POST /applications/{id}/interview
 * endpoint (TEP-653) for both the initial schedule (from submitted /
 * under_review) and a reschedule (from interview_scheduled) — the backend
 * distinguishes the two by the application's current status, not by a
 * different request shape, so this dialog just always sends `interview_at`.
 *
 * If the application is already `interview_scheduled`, the dialog opens in
 * "Reschedule" mode: title, submit button, and success toast all read
 * "Reschedule", and the datetime field is pre-filled with the existing
 * `interview_at` value rather than starting empty.
 */
export const ScheduleInterviewDialog: React.FC<ScheduleInterviewDialogProps> = ({
  isOpen,
  onClose,
  application,
  onSuccess,
}) => {
  const { t, i18n } = useTranslation(['applications', 'common']);
  const isRTL = i18n.language === 'ar';
  const dispatch = useAppDispatch();
  const toast = useToast();

  const { isSchedulingInterview, scheduleInterviewError } = useAppSelector(
    (state) => state.application
  );

  const isReschedule = application?.status === 'interview_scheduled';

  const [interviewAt, setInterviewAt] = useState('');

  // Pre-fill with the existing interview time whenever the dialog (re)opens
  // for a reschedule; start blank for a first-time schedule. Adjusted during
  // render (React's documented pattern for "resetting state when a prop
  // changes") rather than in a useEffect, so it takes effect in the same
  // render as the prop change instead of firing a second, cascading render.
  const prefillKey = isOpen ? `${application?.id ?? ''}:${application?.interview_at ?? ''}` : null;
  const [lastPrefillKey, setLastPrefillKey] = useState<string | null>(null);
  if (isOpen && prefillKey !== lastPrefillKey) {
    setLastPrefillKey(prefillKey);
    setInterviewAt(
      isReschedule && application?.interview_at
        ? toDatetimeLocalValue(application.interview_at)
        : ''
    );
  }

  const minValue = useMemo(() => toDatetimeLocalValue(new Date()), []);

  // Plain string comparison against `minValue`, not a fresh `new Date()`/
  // `Date.now()` call on every render: both values are zero-padded
  // "YYYY-MM-DDTHH:mm" strings, which sort lexicographically the same way
  // they sort chronologically.
  const isFutureValue = useMemo(
    () => !!interviewAt && interviewAt > minValue,
    [interviewAt, minValue]
  );

  const canSubmit = isFutureValue && !isSchedulingInterview && !!application;

  const resetForm = useCallback(() => {
    dispatch(clearScheduleInterviewError());
  }, [dispatch]);

  const handleClose = useCallback(() => {
    if (isSchedulingInterview) return;
    resetForm();
    onClose();
  }, [isSchedulingInterview, resetForm, onClose]);

  const handleConfirm = useCallback(async () => {
    if (!application) return;

    const iso = fromDatetimeLocalValue(interviewAt);
    if (!iso || !isFutureValue) return;

    const result = await dispatch(
      scheduleInterview({ applicationId: application.id, interviewAt: iso })
    );

    if (scheduleInterview.fulfilled.match(result)) {
      toast.success(
        isReschedule
          ? t('applications:interviewDialog.rescheduleSuccessToast', 'Interview rescheduled.')
          : t('applications:interviewDialog.scheduleSuccessToast', 'Interview scheduled.')
      );
      resetForm();
      onSuccess?.();
      onClose();
    }
  }, [
    application,
    interviewAt,
    isFutureValue,
    isReschedule,
    dispatch,
    toast,
    t,
    resetForm,
    onSuccess,
    onClose,
  ]);

  const opportunityTitle =
    application?.opportunity?.title &&
    (application.opportunity.title[i18n.language] ??
      application.opportunity.title['ar'] ??
      application.opportunity.title['en'] ??
      '');

  const studentName = application?.student_profile?.user?.name ?? '';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md p-6">
        <div dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              {isReschedule
                ? t('applications:interviewDialog.rescheduleTitle', 'Reschedule Interview')
                : t('applications:interviewDialog.title', 'Schedule Interview')}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 dark:text-gray-300 mt-2">
              <span className="block">
                {t(
                  'applications:interviewDialog.confirmText',
                  "Pick a date and time for {{name}}'s interview{{title}}.",
                  {
                    name: studentName || t('applications:acceptDialog.thisStudent', 'this student'),
                    title: opportunityTitle ? ` — "${opportunityTitle}"` : '',
                  }
                )}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5 py-2">
            <Label htmlFor="interview-at">
              {t('applications:interviewDialog.dateLabel', 'Interview date & time')}
            </Label>
            <Input
              id="interview-at"
              type="datetime-local"
              value={interviewAt}
              min={minValue}
              onChange={(e) => setInterviewAt(e.target.value)}
              disabled={isSchedulingInterview}
              required
              className="cursor-pointer dark:bg-gray-800 dark:border-gray-700"
            />
            {interviewAt && !isFutureValue && (
              <p className="text-xs text-red-600 dark:text-red-400">
                {t(
                  'applications:interviewDialog.futureDateError',
                  'Interview time must be in the future.'
                )}
              </p>
            )}
          </div>

          {scheduleInterviewError && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {scheduleInterviewError}
            </p>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSchedulingInterview}
              className="cursor-pointer dark:border-gray-700 dark:hover:bg-gray-800"
            >
              {t('applications:interviewDialog.cancel', 'Cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={!canSubmit}
              className="cursor-pointer bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSchedulingInterview ? (
                <>
                  <Loader2 className="h-4 w-4 me-1.5 animate-spin" />
                  {t('applications:interviewDialog.submitting', 'Saving...')}
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 me-1.5" />
                  {isReschedule
                    ? t('applications:interviewDialog.rescheduleButton', 'Reschedule')
                    : t('applications:interviewDialog.confirmButton', 'Schedule Interview')}
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleInterviewDialog;
