import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '@/store';
import { rejectApplication, clearRejectError } from '@/store/slices/applicationSlice';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { XCircle, Loader2 } from 'lucide-react';

interface RejectApplicationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  application: ApplicationItem | null;
  onSuccess?: () => void;
}

const REASON_MAX_LENGTH = 1000;

/**
 * TEP-650 — Reject Application confirmation dialog.
 *
 * Triggered from CompanyApplicationsPage's list (TEP-645). Unlike
 * WithdrawApplicationDialog's optional reason, TEP-649's backend REQUIRES a
 * rejection reason (the company owes the student a concrete explanation),
 * so the submit button stays disabled until the textarea is non-empty —
 * matching the backend's required-reason rule rather than letting the
 * reviewer submit into a 422.
 */
export const RejectApplicationDialog: React.FC<RejectApplicationDialogProps> = ({
  isOpen,
  onClose,
  application,
  onSuccess,
}) => {
  const { t, i18n } = useTranslation(['applications', 'common']);
  const isRTL = i18n.language === 'ar';
  const dispatch = useAppDispatch();
  const toast = useToast();

  const { isRejecting, rejectError } = useAppSelector((state) => state.application);

  const [reason, setReason] = useState('');

  const resetForm = useCallback(() => {
    setReason('');
    dispatch(clearRejectError());
  }, [dispatch]);

  const handleClose = useCallback(() => {
    if (isRejecting) return;
    resetForm();
    onClose();
  }, [isRejecting, resetForm, onClose]);

  const trimmedReason = reason.trim();
  const canSubmit = trimmedReason.length > 0 && !isRejecting && !!application;

  const handleConfirm = useCallback(async () => {
    if (!application || !trimmedReason) return;

    const result = await dispatch(
      rejectApplication({ applicationId: application.id, reason: trimmedReason })
    );

    if (rejectApplication.fulfilled.match(result)) {
      toast.success(t('applications:rejectSuccessToast', 'Application rejected.'));
      resetForm();
      onSuccess?.();
      onClose();
    }
  }, [application, trimmedReason, dispatch, toast, t, resetForm, onSuccess, onClose]);

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
              <XCircle className="h-5 w-5 text-red-600 dark:text-red-500" />
              {t('applications:rejectDialog.title', 'Reject Application')}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 dark:text-gray-300 mt-2 space-y-2">
              <span className="block">
                {t(
                  'applications:rejectDialog.confirmText',
                  "Are you sure you want to reject {{name}}'s application{{title}}? This action cannot be undone.",
                  {
                    name: studentName || t('applications:acceptDialog.thisStudent', 'this student'),
                    title: opportunityTitle ? ` — "${opportunityTitle}"` : '',
                  }
                )}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5 py-2">
            <Label htmlFor="reject-reason">
              {t('applications:rejectDialog.reasonLabel', 'Reason (required)')}
            </Label>
            <Textarea
              id="reject-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, REASON_MAX_LENGTH))}
              placeholder={t(
                'applications:rejectDialog.reasonPlaceholder',
                'Explain why this application is being rejected...'
              )}
              maxLength={REASON_MAX_LENGTH}
              rows={3}
              disabled={isRejecting}
              required
              className="cursor-text dark:bg-gray-800 dark:border-gray-700"
            />
            <div className="flex justify-end text-xs text-gray-400 dark:text-gray-500">
              {reason.length}/{REASON_MAX_LENGTH}
            </div>
          </div>

          {rejectError && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {rejectError}
            </p>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isRejecting}
              className="cursor-pointer dark:border-gray-700 dark:hover:bg-gray-800"
            >
              {t('applications:rejectDialog.cancel', 'Cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirm}
              disabled={!canSubmit}
              className="cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRejecting ? (
                <>
                  <Loader2 className="h-4 w-4 me-1.5 animate-spin" />
                  {t('applications:rejectDialog.submitting', 'Rejecting...')}
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 me-1.5" />
                  {t('applications:rejectDialog.confirmButton', 'Reject Application')}
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RejectApplicationDialog;
