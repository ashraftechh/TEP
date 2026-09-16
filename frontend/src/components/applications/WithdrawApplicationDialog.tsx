import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '@/store';
import { withdrawApplication, clearWithdrawError } from '@/store/slices/applicationSlice';
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
import { AlertTriangle, Loader2, Undo2 } from 'lucide-react';

interface WithdrawApplicationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  application: ApplicationItem | null;
  onSuccess?: () => void;
}

const REASON_MAX_LENGTH = 500;

/**
 * TEP-641 — Withdraw Application confirmation dialog.
 *
 * Triggered from MyApplicationsPage's list (TEP-637). Collects an optional
 * reason, clearly warns that withdrawal cannot be undone, and — per TEP-628's
 * re-apply exception — reassures the student that they may apply again later
 * if they change their mind (accurate expectation-setting, not just "are you
 * sure").
 */
export const WithdrawApplicationDialog: React.FC<WithdrawApplicationDialogProps> = ({
  isOpen,
  onClose,
  application,
  onSuccess,
}) => {
  const { t, i18n } = useTranslation(['applications', 'common']);
  const isRTL = i18n.language === 'ar';
  const dispatch = useAppDispatch();
  const toast = useToast();

  const { isWithdrawing, withdrawError } = useAppSelector((state) => state.application);

  const [reason, setReason] = useState('');

  const resetForm = useCallback(() => {
    setReason('');
    dispatch(clearWithdrawError());
  }, [dispatch]);

  const handleClose = useCallback(() => {
    if (isWithdrawing) return;
    resetForm();
    onClose();
  }, [isWithdrawing, resetForm, onClose]);

  const handleConfirm = useCallback(async () => {
    if (!application) return;

    const result = await dispatch(
      withdrawApplication({
        applicationId: application.id,
        reason: reason.trim() || undefined,
      })
    );

    if (withdrawApplication.fulfilled.match(result)) {
      toast.success(t('applications:withdrawSuccessToast', 'Your application has been withdrawn.'));
      resetForm();
      onSuccess?.();
      onClose();
    }
  }, [application, reason, dispatch, toast, t, resetForm, onSuccess, onClose]);

  const opportunityTitle =
    application?.opportunity?.title &&
    (application.opportunity.title[i18n.language] ??
      application.opportunity.title['ar'] ??
      application.opportunity.title['en'] ??
      '');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md p-6">
        <div dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
              {t('applications:withdrawDialog.title', 'Withdraw Application')}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 dark:text-gray-300 mt-2 space-y-2">
              <span className="block">
                {t(
                  'applications:withdrawDialog.confirmText',
                  'Are you sure you want to withdraw your application{{title}}? This action cannot be undone.',
                  { title: opportunityTitle ? ` — "${opportunityTitle}"` : '' }
                )}
              </span>
              <span className="block text-gray-500 dark:text-gray-400">
                {t(
                  'applications:withdrawDialog.reapplyNote',
                  'You may apply again later if you change your mind, as long as the opportunity is still accepting applications.'
                )}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5 py-2">
            <Label htmlFor="withdraw-reason">
              {t('applications:withdrawDialog.reasonLabel', 'Reason (optional)')}
            </Label>
            <Textarea
              id="withdraw-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, REASON_MAX_LENGTH))}
              placeholder={t(
                'applications:withdrawDialog.reasonPlaceholder',
                'Let the company know why you are withdrawing (optional)...'
              )}
              maxLength={REASON_MAX_LENGTH}
              rows={3}
              disabled={isWithdrawing}
              className="cursor-text dark:bg-gray-800 dark:border-gray-700"
            />
            <div className="flex justify-end text-xs text-gray-400 dark:text-gray-500">
              {reason.length}/{REASON_MAX_LENGTH}
            </div>
          </div>

          {withdrawError && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {withdrawError}
            </p>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isWithdrawing}
              className="cursor-pointer dark:border-gray-700 dark:hover:bg-gray-800"
            >
              {t('applications:withdrawDialog.cancel', 'Cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirm}
              disabled={isWithdrawing || !application}
              className="cursor-pointer"
            >
              {isWithdrawing ? (
                <>
                  <Loader2 className="h-4 w-4 me-1.5 animate-spin" />
                  {t('applications:withdrawDialog.submitting', 'Withdrawing...')}
                </>
              ) : (
                <>
                  <Undo2 className="h-4 w-4 me-1.5" />
                  {t('applications:withdrawDialog.confirmButton', 'Withdraw Application')}
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WithdrawApplicationDialog;
