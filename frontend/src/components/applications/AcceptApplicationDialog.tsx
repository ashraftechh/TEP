import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '@/store';
import { acceptApplication, clearAcceptError } from '@/store/slices/applicationSlice';
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
import { CheckCircle, Loader2 } from 'lucide-react';

interface AcceptApplicationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  application: ApplicationItem | null;
  onSuccess?: () => void;
}

/**
 * TEP-650 — Accept Application confirmation dialog.
 *
 * Triggered from CompanyApplicationsPage's list (TEP-645). Shows the
 * opportunity's current accepted_count/capacity so the reviewer sees the
 * constraint before clicking — the Confirm button is disabled entirely once
 * capacity is reached, rather than letting the reviewer click into a 409
 * (matching the backend's TEP-648 capacity gate).
 */
export const AcceptApplicationDialog: React.FC<AcceptApplicationDialogProps> = ({
  isOpen,
  onClose,
  application,
  onSuccess,
}) => {
  const { t, i18n } = useTranslation(['applications', 'common']);
  const isRTL = i18n.language === 'ar';
  const dispatch = useAppDispatch();
  const toast = useToast();

  const { isAccepting, acceptError } = useAppSelector((state) => state.application);

  const capacity = application?.opportunity?.capacity;
  const acceptedCount = application?.opportunity?.accepted_count;
  const atCapacity =
    capacity !== undefined && acceptedCount !== undefined && acceptedCount >= capacity;

  const resetForm = useCallback(() => {
    dispatch(clearAcceptError());
  }, [dispatch]);

  const handleClose = useCallback(() => {
    if (isAccepting) return;
    resetForm();
    onClose();
  }, [isAccepting, resetForm, onClose]);

  const handleConfirm = useCallback(async () => {
    if (!application) return;

    const result = await dispatch(acceptApplication({ applicationId: application.id }));

    if (acceptApplication.fulfilled.match(result)) {
      toast.success(t('applications:acceptSuccessToast', 'Application accepted.'));
      resetForm();
      onSuccess?.();
      onClose();
    }
  }, [application, dispatch, toast, t, resetForm, onSuccess, onClose]);

  const opportunityTitle =
    application?.opportunity?.title &&
    (application.opportunity.title[i18n.language] ??
      application.opportunity.title['ar'] ??
      application.opportunity.title['en'] ??
      '');

  const studentName = application?.student_profile?.user?.name ?? '';

  const capacityLabel = useMemo(() => {
    if (capacity === undefined || acceptedCount === undefined) return null;
    return t(
      'applications:acceptDialog.capacityLine',
      '{{accepted}} of {{capacity}} slots filled',
      {
        accepted: acceptedCount,
        capacity,
      }
    );
  }, [acceptedCount, capacity, t]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md p-6">
        <div dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-500" />
              {t('applications:acceptDialog.title', 'Accept Application')}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 dark:text-gray-300 mt-2 space-y-2">
              <span className="block">
                {t(
                  'applications:acceptDialog.confirmText',
                  "Are you sure you want to accept {{name}}'s application{{title}}?",
                  {
                    name: studentName || t('applications:acceptDialog.thisStudent', 'this student'),
                    title: opportunityTitle ? ` — "${opportunityTitle}"` : '',
                  }
                )}
              </span>
              {capacityLabel && (
                <span
                  className={`block font-medium ${atCapacity ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}
                >
                  {capacityLabel}
                </span>
              )}
              {atCapacity && (
                <span className="block text-red-600 dark:text-red-400">
                  {t(
                    'applications:acceptDialog.capacityReached',
                    'This opportunity has already reached its accepted-student capacity.'
                  )}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {acceptError && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {acceptError}
            </p>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isAccepting}
              className="cursor-pointer dark:border-gray-700 dark:hover:bg-gray-800"
            >
              {t('applications:acceptDialog.cancel', 'Cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={isAccepting || !application || atCapacity}
              className="cursor-pointer bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAccepting ? (
                <>
                  <Loader2 className="h-4 w-4 me-1.5 animate-spin" />
                  {t('applications:acceptDialog.submitting', 'Accepting...')}
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 me-1.5" />
                  {t('applications:acceptDialog.confirmButton', 'Accept Application')}
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AcceptApplicationDialog;
