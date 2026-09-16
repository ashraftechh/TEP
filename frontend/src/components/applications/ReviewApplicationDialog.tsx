import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '@/store';
import { reviewApplication, clearReviewError } from '@/store/slices/applicationSlice';
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
import { Clock, Loader2 } from 'lucide-react';

interface ReviewApplicationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  application: ApplicationItem | null;
  onSuccess?: () => void;
}

/**
 * TEP-652 — Review Application confirmation dialog.
 *
 * Triggered from CompanyApplicationsPage's list when an application is in 'submitted' status.
 * Moves the application to 'under_review' status.
 */
export const ReviewApplicationDialog: React.FC<ReviewApplicationDialogProps> = ({
  isOpen,
  onClose,
  application,
  onSuccess,
}) => {
  const { t, i18n } = useTranslation(['applications', 'common']);
  const isRTL = i18n.language === 'ar';
  const dispatch = useAppDispatch();
  const toast = useToast();

  const { isReviewing, reviewError } = useAppSelector((state) => state.application);

  const resetForm = useCallback(() => {
    dispatch(clearReviewError());
  }, [dispatch]);

  const handleClose = useCallback(() => {
    if (isReviewing) return;
    resetForm();
    onClose();
  }, [isReviewing, resetForm, onClose]);

  const handleConfirm = useCallback(async () => {
    if (!application) return;

    const result = await dispatch(reviewApplication({ applicationId: application.id }));

    if (reviewApplication.fulfilled.match(result)) {
      toast.success(t('applications:reviewSuccessToast', 'Application is now under review.'));
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md p-6">
        <div dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600 dark:text-blue-500" />
              {t('applications:reviewDialog.title', 'Mark as Under Review')}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-600 dark:text-gray-300 mt-2 space-y-2">
              <span className="block">
                {t(
                  'applications:reviewDialog.confirmText',
                  "Are you sure you want to mark {{name}}'s application{{title}} as under review?",
                  {
                    name: studentName || t('applications:reviewDialog.thisStudent', 'this student'),
                    title: opportunityTitle ? ` — "${opportunityTitle}"` : '',
                  }
                )}
              </span>
              <span className="block text-gray-500 dark:text-gray-400 text-xs">
                {t(
                  'applications:reviewDialog.description',
                  'Moving this application to under review indicates to the student that their submission is currently being evaluated.'
                )}
              </span>
            </DialogDescription>
          </DialogHeader>

          {reviewError && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-3" role="alert">
              {reviewError}
            </p>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isReviewing}
              className="cursor-pointer dark:border-gray-700 dark:hover:bg-gray-800"
            >
              {t('applications:reviewDialog.cancel', 'Cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={isReviewing || !application}
              className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isReviewing ? (
                <>
                  <Loader2 className="h-4 w-4 me-1.5 animate-spin" />
                  {t('applications:reviewDialog.submitting', 'Starting Review...')}
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4 me-1.5" />
                  {t('applications:reviewDialog.confirmButton', 'Start Review')}
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewApplicationDialog;
