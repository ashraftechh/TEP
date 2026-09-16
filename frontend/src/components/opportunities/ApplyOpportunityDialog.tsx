import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  applyToOpportunity,
  uploadCvDocument,
  uploadProfileCv,
  clearApplicationErrors,
  resetApplicationState,
} from '@/store/slices/applicationSlice';
import { markOpportunityApplied } from '@/store/slices/opportunitySlice';
import { fetchProfile } from '@/store/slices/profileSlice';
import { useToast } from '@/context/ToastContext';
import type { OpportunityItem } from '@/types/opportunity';
import type { ApplicationItem } from '@/types/application';
import type { StudentProfileData } from '@/types/profile';
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
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
  MapPin,
  Calendar,
  Send,
  FileCheck,
} from 'lucide-react';

interface ApplyOpportunityDialogProps {
  isOpen: boolean;
  onClose: () => void;
  opportunity: OpportunityItem | null;
  onSuccess?: (application: ApplicationItem) => void;
}

export const ApplyOpportunityDialog: React.FC<ApplyOpportunityDialogProps> = ({
  isOpen,
  onClose,
  opportunity,
  onSuccess,
}) => {
  const { t, i18n } = useTranslation(['opportunities', 'common']);
  const isRTL = i18n.language === 'ar';
  const dispatch = useAppDispatch();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const authUser = useAppSelector((state) => state.auth?.user);
  const profileUser = useAppSelector((state) => state.profile?.profile);
  const studentProfile = (profileUser?.student_profile || authUser?.student_profile) as
    StudentProfileData | undefined;

  const {
    isSubmitting = false,
    isUploadingCv = false,
    error = null,
    errorCode = null,
    validationErrors = {},
  } = useAppSelector((state) => state.application || {});

  const hasProfileCv = Boolean(studentProfile?.cv_file_id);
  const profileCvName =
    studentProfile?.cv_file?.original_name ||
    (isRTL ? 'السيرة الذاتية للملف الشخصي.pdf' : 'Profile_Resume.pdf');

  const [cvSourceOverride, setCvSourceOverride] = useState<'profile' | 'upload' | null>(null);
  const cvSource = cvSourceOverride ?? (hasProfileCv ? 'profile' : 'upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedCvId, setUploadedCvId] = useState<number | null>(null);
  const [uploadedCvName, setUploadedCvName] = useState<string | null>(null);
  const [saveAsProfileCv, setSaveAsProfileCv] = useState(false);
  const [coverNote, setCoverNote] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    dispatch(clearApplicationErrors());
    dispatch(resetApplicationState());
    setCvSourceOverride(null);
    setSelectedFile(null);
    setUploadedCvId(null);
    setUploadedCvName(null);
    setSaveAsProfileCv(false);
    setCoverNote('');
    setLocalError(null);
  }, [dispatch]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      dispatch(fetchProfile());
    }
  }, [isOpen, dispatch]);

  const getLocalized = useCallback(
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type: PDF, DOC, DOCX
    const validExtensions = ['.pdf', '.doc', '.docx'];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      setLocalError(
        isRTL
          ? 'نوع الملف غير مدعوم. يرجى رفع ملف بصيغة PDF أو DOC أو DOCX.'
          : 'Unsupported file format. Please upload a PDF, DOC, or DOCX document.'
      );
      e.target.value = '';
      return;
    }

    // Validate size: max 5MB
    if (file.size > 5 * 1024 * 1024) {
      setLocalError(
        isRTL
          ? 'حجم الملف يتجاوز الحد المسموح به (5 ميجابايت).'
          : 'File size exceeds maximum allowed limit (5MB).'
      );
      e.target.value = '';
      return;
    }

    setSelectedFile(file);

    // Upload file immediately to get a cv_file_id
    try {
      let result;
      if (saveAsProfileCv) {
        result = await dispatch(uploadProfileCv(file));
      } else {
        result = await dispatch(uploadCvDocument(file));
      }

      if (uploadCvDocument.fulfilled.match(result) || uploadProfileCv.fulfilled.match(result)) {
        const fileData = result.payload;
        setUploadedCvId(fileData.id);
        setUploadedCvName(fileData.original_name || file.name);
      } else {
        setLocalError(
          typeof result.payload === 'string'
            ? result.payload
            : isRTL
              ? 'فشل رفع الملف. يرجى المحاولة مرة أخرى.'
              : 'Failed to upload CV file. Please try again.'
        );
      }
    } catch {
      setLocalError(isRTL ? 'حدث خطأ أثناء رفع الملف' : 'An error occurred while uploading file');
    }
  };

  const handleSaveAsProfileCvChange = async (checked: boolean) => {
    setSaveAsProfileCv(checked);
    if (checked && selectedFile) {
      try {
        const result = await dispatch(uploadProfileCv(selectedFile));
        if (uploadProfileCv.fulfilled.match(result)) {
          const fileData = result.payload;
          setUploadedCvId(fileData.id);
          setUploadedCvName(fileData.original_name || selectedFile.name);
        }
      } catch {
        // Non-blocking
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    dispatch(clearApplicationErrors());

    if (!opportunity) return;

    // Validate cover note length
    if (coverNote.length > 3000) {
      setLocalError(
        isRTL
          ? 'رسالة التقديم يجب ألا تتجاوز 3000 حرف.'
          : 'Cover note must not exceed 3,000 characters.'
      );
      return;
    }

    // Resolve CV File ID
    let finalCvFileId = cvSource === 'profile' ? studentProfile?.cv_file_id : uploadedCvId;

    if (cvSource === 'profile' && !studentProfile?.cv_file_id) {
      setLocalError(
        isRTL
          ? 'لم يتم العثور على سيرة ذاتية في ملفك الشخصي. يرجى رفع سيرة ذاتية جديدة.'
          : 'No CV found in your profile. Please upload a new CV.'
      );
      return;
    }

    if (cvSource === 'upload' && !uploadedCvId) {
      if (!selectedFile) {
        setLocalError(
          isRTL
            ? 'يرجى اختيار ملف السيرة الذاتية للتقديم.'
            : 'Please select a CV document to apply.'
        );
        return;
      }
      setLocalError(
        isRTL
          ? 'جاري رفع السيرة الذاتية، يرجى الانتظار قليلاً ثم المحاولة مجدداً.'
          : 'Uploading CV in progress, please wait a moment and submit again.'
      );
      return;
    }

    // If user checked "save as profile CV", ensure profile is updated
    if (saveAsProfileCv && selectedFile) {
      try {
        const profResult = await dispatch(uploadProfileCv(selectedFile));
        if (uploadProfileCv.fulfilled.match(profResult)) {
          finalCvFileId = profResult.payload.id;
        }
      } catch {
        // Continue with application even if profile save fails
      }
    }

    if (!finalCvFileId) {
      setLocalError(
        isRTL ? 'يرجى اختيار أو رفع ملف السيرة الذاتية.' : 'Please select or upload a CV document.'
      );
      return;
    }

    const result = await dispatch(
      applyToOpportunity({
        opportunityId: opportunity.id,
        cv_file_id: finalCvFileId,
        cover_note: coverNote.trim() || undefined,
      })
    );

    if (applyToOpportunity.fulfilled.match(result)) {
      dispatch(markOpportunityApplied(opportunity.id));
      toast.success(
        result.payload.message ||
          (isRTL ? 'تم تقديم طلبك بنجاح!' : 'Your application was submitted successfully!')
      );
      if (onSuccess) {
        onSuccess(result.payload.application);
      }
      handleClose();
    }
  };

  if (!opportunity) return null;

  const companyName =
    getLocalized(opportunity.company?.name) || (isRTL ? 'جهة التدريب' : 'Company');
  const opportunityTitle = getLocalized(opportunity.title);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
        <div dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader className="p-6 pb-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <DialogTitle className="text-lg md:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Send className="h-5 w-5 text-university-primary shrink-0" />
                  <span>
                    {t(
                      'applyDialog.title',
                      isRTL ? 'التقديم على الفرصة التدريبية' : 'Apply for Opportunity'
                    )}
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                  {t(
                    'applyDialog.subtitle',
                    isRTL
                      ? 'أكمل البيانات التالية لإرسال طلب تدريبك إلى جهة التدريب'
                      : 'Complete the form below to submit your application to the company'
                  )}
                </DialogDescription>
              </div>
            </div>

            {/* Opportunity Quick Summary Card */}
            <div className="mt-3 p-3.5 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 flex items-start gap-3 text-xs">
              <div className="h-10 w-10 rounded-md bg-university-primary/10 dark:bg-university-primary/20 flex items-center justify-center text-university-primary font-bold shrink-0">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                  {opportunityTitle}
                </h4>
                <p className="text-gray-600 dark:text-gray-300 font-medium truncate">
                  {companyName}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-gray-500 dark:text-gray-400 pt-0.5">
                  {opportunity.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-university-primary" />
                      <span>{opportunity.location}</span>
                    </span>
                  )}
                  {opportunity.application_deadline && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-amber-600" />
                      <span>
                        {isRTL ? 'آخر موعد: ' : 'Deadline: '}
                        {opportunity.application_deadline}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Specific Server Eligibility Error Alert Banner */}
            {(error || localError) && (
              <div className="p-3.5 rounded-lg border border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 flex items-start gap-2.5 text-xs md:text-sm">
                <AlertCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold">
                    {errorCode === 'deadline_passed'
                      ? isRTL
                        ? 'انتهى موعد التقديم'
                        : 'Application Deadline Passed'
                      : errorCode === 'active_cap_reached'
                        ? isRTL
                          ? 'وصلت للحد الأقصى من الطلبات النشطة'
                          : 'Active Applications Cap Reached'
                        : errorCode === 'opportunity_at_capacity'
                          ? isRTL
                            ? 'اكتملت المقاعد المتاحة'
                            : 'Opportunity Fully Staffed'
                          : errorCode === 'already_applied'
                            ? isRTL
                              ? 'سبق التقديم على هذه الفرصة'
                              : 'Already Applied'
                            : isRTL
                              ? 'تعذر إرسال الطلب'
                              : 'Submission Error'}
                  </p>
                  <p className="leading-relaxed opacity-95">{localError || error}</p>
                </div>
              </div>
            )}

            {/* Section 1: CV / Resume Selection */}
            <div className="space-y-3">
              <Label className="text-xs md:text-sm font-semibold text-gray-900 dark:text-white flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-university-primary" />
                  <span>
                    {t(
                      'applyDialog.cvSection',
                      isRTL ? 'السيرة الذاتية (CV)' : 'Curriculum Vitae (CV)'
                    )}
                  </span>
                  <span className="text-red-500">*</span>
                </span>
              </Label>

              {hasProfileCv ? (
                <div className="space-y-3">
                  {/* Option 1: Profile CV */}
                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-all ${
                      cvSource === 'profile'
                        ? 'border-university-primary bg-university-primary/5 dark:bg-university-primary/10 shadow-xs'
                        : 'border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700 bg-white dark:bg-slate-950/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="cvSource"
                      value="profile"
                      checked={cvSource === 'profile'}
                      onChange={() => setCvSourceOverride('profile')}
                      className="mt-1 text-university-primary focus:ring-university-primary cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <FileCheck className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                        <span className="font-semibold text-xs md:text-sm text-gray-900 dark:text-white truncate">
                          {profileCvName}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-800"
                        >
                          {t(
                            'applyDialog.useProfileCv',
                            isRTL ? 'السيرة المعتمدة للملف' : 'Profile CV'
                          )}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                        {t(
                          'applyDialog.profileCvDesc',
                          isRTL
                            ? 'استخدام السيرة الذاتية المرفوعة مسبقاً في ملفك الشخصي'
                            : 'Use the CV document already saved on your student profile'
                        )}
                      </p>
                    </div>
                  </label>

                  {/* Option 2: Upload new CV for this application */}
                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-all ${
                      cvSource === 'upload'
                        ? 'border-university-primary bg-university-primary/5 dark:bg-university-primary/10 shadow-xs'
                        : 'border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700 bg-white dark:bg-slate-950/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="cvSource"
                      value="upload"
                      checked={cvSource === 'upload'}
                      onChange={() => setCvSourceOverride('upload')}
                      className="mt-1 text-university-primary focus:ring-university-primary cursor-pointer"
                    />
                    <div className="flex-1 min-w-0 space-y-2">
                      <div>
                        <span className="font-semibold text-xs md:text-sm text-gray-900 dark:text-white">
                          {t(
                            'applyDialog.uploadCustomCv',
                            isRTL
                              ? 'رفع سيرة ذاتية مخصصة لهذا الطلب'
                              : 'Upload a specific CV for this application'
                          )}
                        </span>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                          {t(
                            'applyDialog.uploadCustomCvDesc',
                            isRTL
                              ? 'اختر ملف PDF أو DOC أو DOCX (الحد الأقصى 5 ميجابايت)'
                              : 'Select a PDF, DOC, or DOCX file (max 5MB)'
                          )}
                        </p>
                      </div>

                      {cvSource === 'upload' && (
                        <div className="pt-2">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.doc,.docx"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                          {uploadedCvName ? (
                            <div className="flex items-center justify-between p-2.5 rounded-md border border-green-200 dark:border-green-900/60 bg-green-50/50 dark:bg-green-950/30 text-xs">
                              <span className="flex items-center gap-1.5 font-medium text-green-800 dark:text-green-300 truncate">
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
                                <span className="truncate">{uploadedCvName}</span>
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                                className="text-xs h-7 text-gray-600 dark:text-gray-300 hover:text-university-primary"
                              >
                                {isRTL ? 'تغيير' : 'Change'}
                              </Button>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isUploadingCv}
                              className="w-full justify-center border-dashed py-5 border-gray-300 dark:border-slate-700 hover:border-university-primary cursor-pointer text-xs"
                            >
                              {isUploadingCv ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin text-university-primary ml-2" />
                                  <span>
                                    {t(
                                      'applyDialog.submitting',
                                      isRTL ? 'جاري رفع السيرة الذاتية...' : 'Uploading CV...'
                                    )}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <UploadCloud className="h-4 w-4 text-university-primary ml-2" />
                                  <span>
                                    {t(
                                      'applyDialog.uploadPrompt',
                                      isRTL ? 'اختر ملف السيرة الذاتية...' : 'Browse CV file...'
                                    )}
                                  </span>
                                </>
                              )}
                            </Button>
                          )}

                          <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer pt-2">
                            <input
                              type="checkbox"
                              checked={saveAsProfileCv}
                              onChange={(e) => handleSaveAsProfileCvChange(e.target.checked)}
                              disabled={isUploadingCv}
                              className="rounded text-university-primary focus:ring-university-primary cursor-pointer disabled:opacity-50"
                            />
                            <span>
                              {t(
                                'applyDialog.saveAsProfileCv',
                                isRTL
                                  ? 'حفظ هذه السيرة الذاتية كافتراضية جديدة في ملفي الشخصي'
                                  : 'Save this CV as my new default profile CV'
                              )}
                            </span>
                          </label>
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              ) : (
                /* If student has no profile CV yet */
                <div className="space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {uploadedCvName ? (
                    <div className="flex items-center justify-between p-3 rounded-lg border border-green-200 dark:border-green-900/60 bg-green-50/50 dark:bg-green-950/30 text-xs">
                      <span className="flex items-center gap-2 font-medium text-green-800 dark:text-green-300 truncate">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
                        <span className="truncate">{uploadedCvName}</span>
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs h-7 text-gray-600 dark:text-gray-300 hover:text-university-primary"
                      >
                        {isRTL ? 'تغيير الملف' : 'Change'}
                      </Button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-300 dark:border-slate-700 hover:border-university-primary dark:hover:border-university-primary rounded-lg p-6 text-center cursor-pointer transition-colors bg-gray-50/50 dark:bg-slate-950/40"
                    >
                      {isUploadingCv ? (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="h-7 w-7 animate-spin text-university-primary" />
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                            {isRTL ? 'جاري رفع الملف...' : 'Uploading file...'}
                          </span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <UploadCloud className="h-8 w-8 text-university-primary mx-auto" />
                          <div>
                            <p className="text-xs md:text-sm font-semibold text-gray-900 dark:text-white">
                              {t(
                                'applyDialog.uploadPrompt',
                                isRTL
                                  ? 'انقر لاختيار ملف السيرة الذاتية'
                                  : 'Click to upload your CV'
                              )}
                            </p>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                              {t(
                                'applyDialog.uploadFileLimit',
                                isRTL
                                  ? 'PDF, DOC, DOCX (الحد الأقصى 5 ميجابايت)'
                                  : 'PDF, DOC, DOCX (max 5MB)'
                              )}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={saveAsProfileCv}
                      onChange={(e) => handleSaveAsProfileCvChange(e.target.checked)}
                      disabled={isUploadingCv}
                      className="rounded text-university-primary focus:ring-university-primary cursor-pointer disabled:opacity-50"
                    />
                    <span>
                      {t(
                        'applyDialog.saveAsProfileCv',
                        isRTL
                          ? 'حفظ هذه السيرة الذاتية كافتراضية في ملفي الشخصي'
                          : 'Save this CV as my default profile CV'
                      )}
                    </span>
                  </label>
                </div>
              )}
              {validationErrors?.cv_file_id && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  {validationErrors.cv_file_id[0]}
                </p>
              )}
            </div>

            {/* Section 2: Cover Note */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs md:text-sm font-semibold text-gray-900 dark:text-white">
                  {t(
                    'applyDialog.coverNote',
                    isRTL ? 'رسالة التقديم (اختياري)' : 'Cover Note (Optional)'
                  )}
                </Label>
                <span className="text-[11px] text-gray-400">{coverNote.length} / 3000</span>
              </div>
              <Textarea
                rows={4}
                maxLength={3000}
                value={coverNote}
                onChange={(e) => setCoverNote(e.target.value)}
                placeholder={t(
                  'applyDialog.coverNotePlaceholder',
                  isRTL
                    ? 'اكتب نبذة موجزة توضح اهتمامك بالفرصة التدريبية ومهاراتك وخبراتك ذات الصلة...'
                    : 'Write a brief note explaining your motivation, relevant skills, and why you are a great fit for this opportunity...'
                )}
                className="text-xs md:text-sm resize-y min-h-[90px] border-gray-200 dark:border-slate-800 focus:border-university-primary"
              />
              {validationErrors?.cover_note && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  {validationErrors.cover_note[0]}
                </p>
              )}
            </div>

            <DialogFooter className="pt-2 border-t border-gray-100 dark:border-slate-800 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting || isUploadingCv}
                className="w-full sm:w-auto cursor-pointer text-xs"
              >
                {t('applyDialog.cancel', isRTL ? 'إلغاء' : 'Cancel')}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || isUploadingCv}
                className="w-full sm:w-auto bg-university-primary hover:bg-university-secondary text-white font-semibold text-xs cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>
                      {t(
                        'applyDialog.submitting',
                        isRTL ? 'جاري إرسال الطلب...' : 'Submitting Application...'
                      )}
                    </span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>
                      {t('applyDialog.submit', isRTL ? 'تأكيد التقديم' : 'Submit Application')}
                    </span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
