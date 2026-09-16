import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  fetchMajors,
  fetchSkills,
  fetchOpportunityTypes,
  fetchTrainingCycles,
} from '@/store/slices/lookupSlice';
import {
  updateOpportunity,
  clearUpdateStatus,
  fetchOpportunities,
} from '@/store/slices/opportunitySlice';
import { useToast } from '@/context/ToastContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  Building2,
  Calendar,
  Check,
  Globe,
  GraduationCap,
  Layers,
  Loader2,
  MapPin,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { createOpportunitySchema, type OpportunityFormValues } from '@/lib/validations/opportunity';
import type { OpportunityItem, UpdateOpportunityPayload } from '@/types/opportunity';

interface EditOpportunityDialogProps {
  opportunity: OpportunityItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// Helper to extract string from translatable field
const getFieldText = (field: unknown, locale: 'ar' | 'en'): string => {
  if (!field) return '';
  if (typeof field === 'string') return field;
  if (typeof field === 'object' && field !== null) {
    const loc = field as Record<string, string>;
    return loc[locale] || '';
  }
  return '';
};

export const EditOpportunityDialog: React.FC<EditOpportunityDialogProps> = ({
  opportunity,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const { t, i18n } = useTranslation(['opportunities', 'common']);
  const isRTL = i18n.language === 'ar';
  const dispatch = useAppDispatch();
  const toast = useToast();

  const { majors, skills, opportunityTypes, trainingCycles, isLoadingMajors, isLoadingSkills } =
    useAppSelector((state) => state.lookup);

  const { isUpdating, updateErrorCode, validationErrors } = useAppSelector(
    (state) => state.opportunity
  );

  const [selectedMajorIds, setSelectedMajorIds] = useState<number[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<number[]>([]);
  const [majorSearch, setMajorSearch] = useState('');
  const [skillSearch, setSkillSearch] = useState('');

  const schema = useMemo(() => createOpportunitySchema(t), [t]);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    clearErrors,
    trigger,
    formState: { errors, isSubmitted },
  } = useForm<OpportunityFormValues>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      title_ar: '',
      title_en: '',
      department_ar: '',
      department_en: '',
      opportunity_type_id: '',
      training_cycle_id: '',
      location: '',
      duration: '',
      capacity: 1,
      salary: '',
      work_mode: 'full_time',
      start_date: '',
      end_date: '',
      application_deadline: '',
      description_ar: '',
      description_en: '',
      requirements_ar_text: '',
      requirements_en_text: '',
      benefits_ar_text: '',
      benefits_en_text: '',
    },
  });

  // Watch requirements and benefits for real-time parity indicators
  const reqArText = useWatch({ control, name: 'requirements_ar_text', defaultValue: '' });
  const reqEnText = useWatch({ control, name: 'requirements_en_text', defaultValue: '' });
  const benArText = useWatch({ control, name: 'benefits_ar_text', defaultValue: '' });
  const benEnText = useWatch({ control, name: 'benefits_en_text', defaultValue: '' });
  const startDateValue = useWatch({ control, name: 'start_date', defaultValue: '' });

  // Pre-fill form when opportunity changes or dialog opens
  useEffect(() => {
    if (open && opportunity) {
      const reqsAr = (opportunity.requirements || [])
        .map((r) => getFieldText(r.requirement_text, 'ar'))
        .filter(Boolean)
        .join('\n');
      const reqsEn = (opportunity.requirements || [])
        .map((r) => getFieldText(r.requirement_text, 'en'))
        .filter(Boolean)
        .join('\n');
      const bensAr = (opportunity.benefits || [])
        .map((b) => getFieldText(b.benefit_text, 'ar'))
        .filter(Boolean)
        .join('\n');
      const bensEn = (opportunity.benefits || [])
        .map((b) => getFieldText(b.benefit_text, 'en'))
        .filter(Boolean)
        .join('\n');

      reset({
        title_ar: getFieldText(opportunity.title, 'ar'),
        title_en: getFieldText(opportunity.title, 'en'),
        department_ar: getFieldText(opportunity.department, 'ar'),
        department_en: getFieldText(opportunity.department, 'en'),
        opportunity_type_id: opportunity.opportunity_type_id
          ? String(opportunity.opportunity_type_id)
          : '',
        training_cycle_id: opportunity.training_cycle_id
          ? String(opportunity.training_cycle_id)
          : '',
        location: opportunity.location || '',
        duration: opportunity.duration || '',
        capacity: opportunity.capacity || 1,
        salary:
          opportunity.salary !== null && opportunity.salary !== undefined
            ? String(opportunity.salary)
            : '',
        work_mode: opportunity.work_mode || 'full_time',
        start_date: opportunity.start_date || '',
        end_date: opportunity.end_date || '',
        application_deadline: opportunity.application_deadline || '',
        description_ar: getFieldText(opportunity.description, 'ar'),
        description_en: getFieldText(opportunity.description, 'en'),
        requirements_ar_text: reqsAr,
        requirements_en_text: reqsEn,
        benefits_ar_text: bensAr,
        benefits_en_text: bensEn,
      });

      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedMajorIds((opportunity.majors || []).map((m) => m.id));

      setSelectedSkillIds((opportunity.skills || []).map((s) => s.id));

      setMajorSearch('');

      setSkillSearch('');
      dispatch(clearUpdateStatus());
    }
  }, [open, opportunity, reset, dispatch]);

  // Map server-side validation errors to react-hook-form fields
  useEffect(() => {
    if (validationErrors && Object.keys(validationErrors).length > 0) {
      Object.entries(validationErrors).forEach(([field, messages]) => {
        if (messages && messages.length > 0) {
          let formField = field as keyof OpportunityFormValues;
          if (field === 'requirements_en' || field === 'requirements_ar') {
            formField = 'requirements_en_text';
          } else if (field === 'benefits_en' || field === 'benefits_ar') {
            formField = 'benefits_en_text';
          }

          setError(formField, {
            type: 'server',
            message: messages[0],
          });
        }
      });
    }
  }, [validationErrors, setError]);

  // Re-trigger validation on language change if submitted
  useEffect(() => {
    if (isSubmitted) {
      trigger();
    }
  }, [i18n.language, isSubmitted, trigger]);

  // Fetch lookup data on open
  useEffect(() => {
    if (open) {
      if (majors.length === 0) dispatch(fetchMajors());
      if (skills.length === 0) dispatch(fetchSkills());
      if (opportunityTypes.length === 0) dispatch(fetchOpportunityTypes());
      if (trainingCycles.length === 0) dispatch(fetchTrainingCycles());
    }
  }, [
    open,
    dispatch,
    majors.length,
    skills.length,
    opportunityTypes.length,
    trainingCycles.length,
  ]);

  const getFieldError = (field: keyof OpportunityFormValues): string | undefined => {
    if (errors[field]?.message) return errors[field]?.message;
    const serverErr = validationErrors?.[field];
    if (serverErr && serverErr.length > 0) {
      return serverErr[0];
    }
    return undefined;
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      dispatch(clearUpdateStatus());
    }
    onOpenChange(isOpen);
  };

  const handleReload = () => {
    dispatch(fetchOpportunities());
    handleClose(false);
  };

  const getLocalizedName = useCallback(
    (item: { name: unknown }) => {
      if (typeof item.name === 'string') return item.name;
      if (typeof item.name === 'object' && item.name !== null) {
        const loc = item.name as Record<string, string>;
        return isRTL ? loc.ar || loc.en || '' : loc.en || loc.ar || '';
      }
      return '';
    },
    [isRTL]
  );

  // Line count calculations for translatable list fields
  const reqArLines = useMemo(
    () =>
      (reqArText || '')
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0),
    [reqArText]
  );
  const reqEnLines = useMemo(
    () =>
      (reqEnText || '')
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0),
    [reqEnText]
  );
  const hasReqMismatch =
    (reqArLines.length > 0 || reqEnLines.length > 0) && reqArLines.length !== reqEnLines.length;

  const benArLines = useMemo(
    () =>
      (benArText || '')
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0),
    [benArText]
  );
  const benEnLines = useMemo(
    () =>
      (benEnText || '')
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0),
    [benEnText]
  );
  const hasBenMismatch =
    (benArLines.length > 0 || benEnLines.length > 0) && benArLines.length !== benEnLines.length;

  const filteredMajors = useMemo(() => {
    return majors.filter((m) =>
      getLocalizedName(m).toLowerCase().includes(majorSearch.toLowerCase())
    );
  }, [majors, majorSearch, getLocalizedName]);

  const filteredSkills = useMemo(() => {
    return skills.filter((s) =>
      getLocalizedName(s).toLowerCase().includes(skillSearch.toLowerCase())
    );
  }, [skills, skillSearch, getLocalizedName]);

  const toggleMajor = (id: number) => {
    setSelectedMajorIds((prev) =>
      prev.includes(id) ? prev.filter((mId) => mId !== id) : [...prev, id]
    );
  };

  const toggleSkill = (id: number) => {
    setSelectedSkillIds((prev) =>
      prev.includes(id) ? prev.filter((sId) => sId !== id) : [...prev, id]
    );
  };

  const onSubmit = async (values: OpportunityFormValues) => {
    if (!opportunity) return;

    const payload: UpdateOpportunityPayload = {
      version: opportunity.version,
      title_ar: values.title_ar.trim(),
      title_en: values.title_en.trim(),
      department_ar: values.department_ar?.trim() || undefined,
      department_en: values.department_en?.trim() || undefined,
      description_ar: values.description_ar.trim(),
      description_en: values.description_en.trim(),
      opportunity_type_id: parseInt(values.opportunity_type_id, 10),
      training_cycle_id: values.training_cycle_id
        ? parseInt(values.training_cycle_id, 10)
        : undefined,
      work_mode: values.work_mode,
      location: values.location?.trim() || undefined,
      duration: values.duration?.trim() || undefined,
      capacity: Number(values.capacity) || 1,
      salary: values.salary ? parseFloat(values.salary) : undefined,
      start_date: values.start_date || undefined,
      end_date: values.end_date || undefined,
      application_deadline: values.application_deadline || undefined,
      major_ids: selectedMajorIds.length > 0 ? selectedMajorIds : undefined,
      skill_ids: selectedSkillIds.length > 0 ? selectedSkillIds : undefined,
      requirements_ar: reqArLines.length > 0 ? reqArLines : undefined,
      requirements_en: reqEnLines.length > 0 ? reqEnLines : undefined,
      benefits_ar: benArLines.length > 0 ? benArLines : undefined,
      benefits_en: benEnLines.length > 0 ? benEnLines : undefined,
    };

    const result = await dispatch(updateOpportunity({ id: opportunity.id, payload }));

    if (updateOpportunity.fulfilled.match(result)) {
      toast.success(t('opportunities:editSuccessMessage', 'Opportunity updated successfully!'));
      handleClose(false);
      onSuccess?.();
    } else if (updateOpportunity.rejected.match(result)) {
      const errMsg =
        result.payload?.message ||
        (isRTL
          ? 'فشل تحديث الفرصة التدريبية. يرجى التحقق من صحة البيانات المدخلة.'
          : 'Failed to update opportunity. Please check the entered data.');
      toast.error(errMsg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6 md:p-8">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-university-primary/10 text-university-primary dark:bg-university-primary/20">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">
                {t('opportunities:editOpportunity', 'Edit Training Opportunity')}
              </DialogTitle>
              <p className="text-sm text-foreground-muted">
                {t(
                  'opportunities:editSubtitle',
                  'Update opportunity details, capacity, and requirements'
                )}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Version Mismatch Warning Alert (409 Conflict) */}
        {updateErrorCode === 'version_mismatch' && (
          <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold">
                  {t('opportunities:versionMismatchTitle', 'Conflict Detected')}
                </h4>
                <p className="mt-1 text-sm">
                  {t(
                    'opportunities:versionMismatchDesc',
                    'This opportunity was changed by someone else. Please review the latest version before saving again.'
                  )}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleReload}
                  className="mt-3 cursor-pointer bg-white dark:bg-slate-900 font-medium"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5 rtl:mr-0 rtl:ml-1.5" />
                  {t('opportunities:reloadLatest', 'Reload Latest Version')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Company Not Approved Warning (403) */}
        {updateErrorCode === 'company_not_approved' && (
          <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <h4 className="font-semibold">{t('opportunities:form.companyNotApprovedTitle')}</h4>
                <p className="text-sm mt-1 text-amber-800 dark:text-amber-300">
                  {t('opportunities:form.companyNotApprovedDesc')}
                </p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
          {/* Section 1: Basic Information (Bilingual) */}
          <div className="space-y-4 rounded-lg border border-border bg-surface-secondary/30 p-4">
            <div className="flex items-center gap-2 border-b border-border pb-2">
              <Globe className="h-4 w-4 text-university-primary" />
              <h3 className="text-sm font-semibold text-foreground">
                {t('opportunities:form.titleSection')}
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="title_ar" className="text-xs font-medium" required>
                  {t('opportunities:form.titleAr')}
                </Label>
                <Input
                  id="title_ar"
                  dir="rtl"
                  placeholder={t('opportunities:form.titleArPlaceholder')}
                  aria-invalid={!!getFieldError('title_ar')}
                  className="mt-1"
                  {...register('title_ar', {
                    onChange: () => {
                      if (getFieldError('title_ar')) clearErrors('title_ar');
                    },
                  })}
                />
                {getFieldError('title_ar') && (
                  <p className="text-xs text-destructive font-medium mt-1">
                    {getFieldError('title_ar')}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="title_en" className="text-xs font-medium" required>
                  {t('opportunities:form.titleEn')}
                </Label>
                <Input
                  id="title_en"
                  dir="ltr"
                  placeholder={t('opportunities:form.titleEnPlaceholder')}
                  aria-invalid={!!getFieldError('title_en')}
                  className="mt-1"
                  {...register('title_en', {
                    onChange: () => {
                      if (getFieldError('title_en')) clearErrors('title_en');
                    },
                  })}
                />
                {getFieldError('title_en') && (
                  <p className="text-xs text-destructive font-medium mt-1">
                    {getFieldError('title_en')}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="department_ar" className="text-xs font-medium">
                  {t('opportunities:form.departmentAr')}
                </Label>
                <Input
                  id="department_ar"
                  dir="rtl"
                  placeholder={t('opportunities:form.departmentArPlaceholder')}
                  aria-invalid={!!getFieldError('department_ar')}
                  className="mt-1"
                  {...register('department_ar', {
                    onChange: () => {
                      if (getFieldError('department_ar')) clearErrors('department_ar');
                    },
                  })}
                />
                {getFieldError('department_ar') && (
                  <p className="text-xs text-destructive font-medium mt-1">
                    {getFieldError('department_ar')}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="department_en" className="text-xs font-medium">
                  {t('opportunities:form.departmentEn')}
                </Label>
                <Input
                  id="department_en"
                  dir="ltr"
                  placeholder={t('opportunities:form.departmentEnPlaceholder')}
                  aria-invalid={!!getFieldError('department_en')}
                  className="mt-1"
                  {...register('department_en', {
                    onChange: () => {
                      if (getFieldError('department_en')) clearErrors('department_en');
                    },
                  })}
                />
                {getFieldError('department_en') && (
                  <p className="text-xs text-destructive font-medium mt-1">
                    {getFieldError('department_en')}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="opportunity_type_id" className="text-xs font-medium" required>
                  {t('opportunities:form.opportunityType')}
                </Label>
                <Controller
                  control={control}
                  name="opportunity_type_id"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(val) => {
                        field.onChange(val);
                        if (getFieldError('opportunity_type_id'))
                          clearErrors('opportunity_type_id');
                      }}
                    >
                      <SelectTrigger
                        id="opportunity_type_id"
                        aria-invalid={!!getFieldError('opportunity_type_id')}
                        className="mt-1 cursor-pointer"
                      >
                        <SelectValue placeholder={t('opportunities:form.selectOpportunityType')}>
                          {field.value
                            ? (() => {
                                const found = opportunityTypes.find(
                                  (ot) => String(ot.id) === field.value
                                );
                                return found
                                  ? getLocalizedName(found)
                                  : t('opportunities:form.selectOpportunityType');
                              })()
                            : t('opportunities:form.selectOpportunityType')}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {opportunityTypes.map((type) => (
                          <SelectItem
                            key={type.id}
                            value={String(type.id)}
                            className="cursor-pointer"
                          >
                            {getLocalizedName(type)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {getFieldError('opportunity_type_id') && (
                  <p className="text-xs text-destructive font-medium mt-1">
                    {getFieldError('opportunity_type_id')}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="training_cycle_id" className="text-xs font-medium">
                  {t('opportunities:form.trainingCycle')}
                </Label>
                <Controller
                  control={control}
                  name="training_cycle_id"
                  render={({ field }) => (
                    <Select
                      value={field.value || ''}
                      onValueChange={(val) => {
                        field.onChange(val);
                        if (getFieldError('training_cycle_id')) clearErrors('training_cycle_id');
                      }}
                    >
                      <SelectTrigger
                        id="training_cycle_id"
                        aria-invalid={!!getFieldError('training_cycle_id')}
                        className="mt-1 cursor-pointer"
                      >
                        <SelectValue placeholder={t('opportunities:form.selectTrainingCycle')}>
                          {field.value
                            ? (() => {
                                const found = trainingCycles.find(
                                  (tc) => String(tc.id) === field.value
                                );
                                return found
                                  ? getLocalizedName(found)
                                  : t('opportunities:form.selectTrainingCycle');
                              })()
                            : t('opportunities:form.selectTrainingCycle')}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {trainingCycles.length === 0 ? (
                          <div className="p-2 text-xs text-foreground-muted text-center">
                            {t('opportunities:form.noTrainingCycles')}
                          </div>
                        ) : (
                          <>
                            <SelectItem value="" className="cursor-pointer text-foreground-muted">
                              {t('opportunities:form.noSpecificCycle')}
                            </SelectItem>
                            {trainingCycles.map((cycle) => (
                              <SelectItem
                                key={cycle.id}
                                value={String(cycle.id)}
                                className="cursor-pointer"
                              >
                                {getLocalizedName(cycle)} ({cycle.academic_year})
                              </SelectItem>
                            ))}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                />
                {getFieldError('training_cycle_id') && (
                  <p className="text-xs text-destructive font-medium mt-1">
                    {getFieldError('training_cycle_id')}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Location, Duration & Logistics */}
          <div className="space-y-4 rounded-lg border border-border bg-surface-secondary/30 p-4">
            <div className="flex items-center gap-2 border-b border-border pb-2">
              <MapPin className="h-4 w-4 text-university-primary" />
              <h3 className="text-sm font-semibold text-foreground">
                {t('opportunities:form.locationSection')}
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="location" className="text-xs font-medium">
                  {t('opportunities:form.location')}
                </Label>
                <Input
                  id="location"
                  placeholder={t('opportunities:form.locationPlaceholder')}
                  aria-invalid={!!getFieldError('location')}
                  className="mt-1"
                  {...register('location', {
                    onChange: () => {
                      if (getFieldError('location')) clearErrors('location');
                    },
                  })}
                />
                {getFieldError('location') && (
                  <p className="text-xs text-destructive font-medium mt-1">
                    {getFieldError('location')}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="duration" className="text-xs font-medium">
                  {t('opportunities:form.duration')}
                </Label>
                <Input
                  id="duration"
                  placeholder={t('opportunities:form.durationPlaceholder')}
                  aria-invalid={!!getFieldError('duration')}
                  className="mt-1"
                  {...register('duration', {
                    onChange: () => {
                      if (getFieldError('duration')) clearErrors('duration');
                    },
                  })}
                />
                {getFieldError('duration') && (
                  <p className="text-xs text-destructive font-medium mt-1">
                    {getFieldError('duration')}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="capacity" className="text-xs font-medium" required>
                  {t('opportunities:form.capacity')}
                </Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  aria-invalid={!!getFieldError('capacity')}
                  className="mt-1"
                  {...register('capacity', {
                    valueAsNumber: true,
                    onChange: () => {
                      if (getFieldError('capacity')) clearErrors('capacity');
                    },
                  })}
                />
                {getFieldError('capacity') && (
                  <p className="text-xs text-destructive font-medium mt-1">
                    {getFieldError('capacity')}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div>
                <Label htmlFor="salary" className="text-xs font-medium">
                  {t('opportunities:form.salary')}
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="salary"
                    type="number"
                    min="0"
                    step="50"
                    placeholder={t('opportunities:form.salaryPlaceholder')}
                    aria-invalid={!!getFieldError('salary')}
                    className={isRTL ? 'pl-14' : 'pr-14'}
                    {...register('salary', {
                      onChange: () => {
                        if (getFieldError('salary')) clearErrors('salary');
                      },
                    })}
                  />
                  <div
                    className={`absolute inset-y-0 ${
                      isRTL ? 'left-0 pl-3' : 'right-0 pr-3'
                    } flex items-center pointer-events-none text-xs font-semibold text-foreground-muted`}
                  >
                    {t('opportunities:currency', 'ريال')}
                  </div>
                </div>
                {getFieldError('salary') && (
                  <p className="text-xs text-destructive font-medium mt-1">
                    {getFieldError('salary')}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="work_mode" className="text-xs font-medium">
                  {t('opportunities:form.workMode')}
                </Label>
                <Controller
                  control={control}
                  name="work_mode"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="work_mode" className="mt-1 cursor-pointer">
                        <SelectValue placeholder={t('opportunities:form.selectWorkMode')}>
                          {field.value ? t(`opportunities:workModes.${field.value}`) : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full_time" className="cursor-pointer">
                          {t('opportunities:workModes.full_time')}
                        </SelectItem>
                        <SelectItem value="part_time" className="cursor-pointer">
                          {t('opportunities:workModes.part_time')}
                        </SelectItem>
                        <SelectItem value="remote" className="cursor-pointer">
                          {t('opportunities:workModes.remote')}
                        </SelectItem>
                        <SelectItem value="hybrid" className="cursor-pointer">
                          {t('opportunities:workModes.hybrid')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Schedule & Dates */}
          <div className="space-y-4 rounded-lg border border-border bg-surface-secondary/30 p-4">
            <div className="flex items-center gap-2 border-b border-border pb-2">
              <Calendar className="h-4 w-4 text-university-primary" />
              <h3 className="text-sm font-semibold text-foreground">
                {t('opportunities:form.datesSection')}
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="start_date" className="text-xs font-medium">
                  {t('opportunities:form.startDate')}
                </Label>
                <Input
                  id="start_date"
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  aria-invalid={!!getFieldError('start_date')}
                  className="mt-1 cursor-pointer text-start rtl:text-right"
                  {...register('start_date', {
                    onChange: () => {
                      if (getFieldError('start_date')) clearErrors('start_date');
                      if (getFieldError('end_date')) trigger('end_date');
                    },
                  })}
                />
                {getFieldError('start_date') && (
                  <p className="text-xs text-destructive font-medium mt-1">
                    {getFieldError('start_date')}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="end_date" className="text-xs font-medium">
                  {t('opportunities:form.endDate')}
                </Label>
                <Input
                  id="end_date"
                  type="date"
                  min={startDateValue || new Date().toISOString().split('T')[0]}
                  aria-invalid={!!getFieldError('end_date')}
                  className="mt-1 cursor-pointer text-start rtl:text-right"
                  {...register('end_date', {
                    onChange: () => {
                      if (getFieldError('end_date')) clearErrors('end_date');
                    },
                  })}
                />
                {getFieldError('end_date') && (
                  <p className="text-xs text-destructive font-medium mt-1">
                    {getFieldError('end_date')}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="application_deadline" className="text-xs font-medium">
                  {t('opportunities:form.applicationDeadline')}
                </Label>
                <Input
                  id="application_deadline"
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  aria-invalid={!!getFieldError('application_deadline')}
                  className="mt-1 cursor-pointer text-start rtl:text-right"
                  {...register('application_deadline', {
                    onChange: () => {
                      if (getFieldError('application_deadline'))
                        clearErrors('application_deadline');
                    },
                  })}
                />
                {getFieldError('application_deadline') && (
                  <p className="text-xs text-destructive font-medium mt-1">
                    {getFieldError('application_deadline')}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 4: Majors & Skills Multi-Select */}
          <div className="space-y-4 rounded-lg border border-border bg-surface-secondary/30 p-4">
            <div className="flex items-center gap-2 border-b border-border pb-2">
              <GraduationCap className="h-4 w-4 text-university-primary" />
              <h3 className="text-sm font-semibold text-foreground">
                {t('opportunities:form.qualificationsSection')}
              </h3>
            </div>

            {/* Majors Selection */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <Label className="text-xs font-medium">{t('opportunities:form.majors')}</Label>
                <span className="text-xs text-foreground-muted">
                  {selectedMajorIds.length} {t('opportunities:all')}
                </span>
              </div>
              <Input
                placeholder={t('opportunities:form.selectMajors')}
                value={majorSearch}
                onChange={(e) => setMajorSearch(e.target.value)}
                className="mb-2"
              />
              <div className="max-h-36 overflow-y-auto rounded-md border border-border p-2 bg-surface flex flex-wrap gap-1.5">
                {isLoadingMajors ? (
                  <div className="flex items-center justify-center w-full py-4 text-xs text-foreground-muted">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  </div>
                ) : filteredMajors.length === 0 ? (
                  <span className="text-xs text-foreground-muted p-2">
                    {isRTL ? 'لا توجد نتائج' : 'No majors found'}
                  </span>
                ) : (
                  filteredMajors.map((major) => {
                    const isSelected = selectedMajorIds.includes(major.id);
                    return (
                      <Badge
                        key={major.id}
                        variant={isSelected ? 'default' : 'outline'}
                        onClick={() => toggleMajor(major.id)}
                        className={`cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-university-primary text-white hover:bg-university-secondary'
                            : 'hover:bg-surface-secondary'
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 mr-1" />}
                        {getLocalizedName(major)}
                      </Badge>
                    );
                  })
                )}
              </div>
            </div>

            {/* Skills Selection */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <Label className="text-xs font-medium">{t('opportunities:form.skills')}</Label>
                <span className="text-xs text-foreground-muted">
                  {selectedSkillIds.length} {t('opportunities:all')}
                </span>
              </div>
              <Input
                placeholder={t('opportunities:form.selectSkills')}
                value={skillSearch}
                onChange={(e) => setSkillSearch(e.target.value)}
                className="mb-2"
              />
              <div className="max-h-36 overflow-y-auto rounded-md border border-border p-2 bg-surface flex flex-wrap gap-1.5">
                {isLoadingSkills ? (
                  <div className="flex items-center justify-center w-full py-4 text-xs text-foreground-muted">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  </div>
                ) : filteredSkills.length === 0 ? (
                  <span className="text-xs text-foreground-muted p-2">
                    {isRTL ? 'لا توجد نتائج' : 'No skills found'}
                  </span>
                ) : (
                  filteredSkills.map((skill) => {
                    const isSelected = selectedSkillIds.includes(skill.id);
                    return (
                      <Badge
                        key={skill.id}
                        variant={isSelected ? 'default' : 'outline'}
                        onClick={() => toggleSkill(skill.id)}
                        className={`cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-university-primary text-white hover:bg-university-secondary'
                            : 'hover:bg-surface-secondary'
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 mr-1" />}
                        {getLocalizedName(skill)}
                      </Badge>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Section 5: Description (Bilingual) */}
          <div className="space-y-4 rounded-lg border border-border bg-surface-secondary/30 p-4">
            <div className="flex items-center gap-2 border-b border-border pb-2">
              <Layers className="h-4 w-4 text-university-primary" />
              <h3 className="text-sm font-semibold text-foreground">
                {t('opportunities:form.descriptionSection')}
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="description_ar" className="text-xs font-medium" required>
                  {t('opportunities:form.descriptionAr')}
                </Label>
                <Textarea
                  id="description_ar"
                  dir="rtl"
                  rows={4}
                  placeholder={t('opportunities:form.descriptionArPlaceholder')}
                  aria-invalid={!!getFieldError('description_ar')}
                  className="mt-1 resize-y"
                  {...register('description_ar', {
                    onChange: () => {
                      if (getFieldError('description_ar')) clearErrors('description_ar');
                    },
                  })}
                />
                {getFieldError('description_ar') && (
                  <p className="text-xs text-destructive font-medium mt-1">
                    {getFieldError('description_ar')}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="description_en" className="text-xs font-medium" required>
                  {t('opportunities:form.descriptionEn')}
                </Label>
                <Textarea
                  id="description_en"
                  dir="ltr"
                  rows={4}
                  placeholder={t('opportunities:form.descriptionEnPlaceholder')}
                  aria-invalid={!!getFieldError('description_en')}
                  className="mt-1 resize-y"
                  {...register('description_en', {
                    onChange: () => {
                      if (getFieldError('description_en')) clearErrors('description_en');
                    },
                  })}
                />
                {getFieldError('description_en') && (
                  <p className="text-xs text-destructive font-medium mt-1">
                    {getFieldError('description_en')}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 6: Requirements & Benefits (Translatable Lists with Parity Indicator) */}
          <div className="space-y-6 rounded-lg border border-border bg-surface-secondary/30 p-4">
            {/* Requirements */}
            <div className="space-y-2">
              <div className="flex justify-between items-center border-b border-border pb-2">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-university-primary" />
                  <h3 className="text-sm font-semibold text-foreground">
                    {t('opportunities:form.requirementsSection')}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={hasReqMismatch ? 'destructive' : 'secondary'} className="text-xs">
                    {t('opportunities:form.lineParity', {
                      ar: reqArLines.length,
                      en: reqEnLines.length,
                    })}
                  </Badge>
                </div>
              </div>

              {hasReqMismatch && (
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                  {t('opportunities:form.mismatchWarning')}
                </p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="requirements_ar" className="text-xs font-medium">
                    {t('opportunities:form.requirementsAr')}
                  </Label>
                  <Textarea
                    id="requirements_ar"
                    dir="rtl"
                    rows={4}
                    placeholder={t('opportunities:form.requirementsArPlaceholder')}
                    aria-invalid={!!getFieldError('requirements_ar_text')}
                    className="mt-1 resize-y"
                    {...register('requirements_ar_text', {
                      onChange: () => {
                        if (getFieldError('requirements_ar_text'))
                          clearErrors('requirements_ar_text');
                        if (isSubmitted) trigger('requirements_en_text');
                      },
                    })}
                  />
                  {getFieldError('requirements_ar_text') && (
                    <p className="text-xs text-destructive font-medium mt-1">
                      {getFieldError('requirements_ar_text')}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="requirements_en" className="text-xs font-medium">
                    {t('opportunities:form.requirementsEn')}
                  </Label>
                  <Textarea
                    id="requirements_en"
                    dir="ltr"
                    rows={4}
                    placeholder={t('opportunities:form.requirementsEnPlaceholder')}
                    aria-invalid={!!getFieldError('requirements_en_text')}
                    className="mt-1 resize-y"
                    {...register('requirements_en_text', {
                      onChange: () => {
                        if (getFieldError('requirements_en_text'))
                          clearErrors('requirements_en_text');
                        if (isSubmitted) trigger('requirements_en_text');
                      },
                    })}
                  />
                  {getFieldError('requirements_en_text') && (
                    <p className="text-xs text-destructive font-medium mt-1">
                      {getFieldError('requirements_en_text')}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Benefits */}
            <div className="space-y-2 pt-4 border-t border-border">
              <div className="flex justify-between items-center border-b border-border pb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-university-primary" />
                  <h3 className="text-sm font-semibold text-foreground">
                    {t('opportunities:form.benefitsSection')}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={hasBenMismatch ? 'destructive' : 'secondary'} className="text-xs">
                    {t('opportunities:form.lineParity', {
                      ar: benArLines.length,
                      en: benEnLines.length,
                    })}
                  </Badge>
                </div>
              </div>

              {hasBenMismatch && (
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                  {t('opportunities:form.mismatchWarning')}
                </p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="benefits_ar" className="text-xs font-medium">
                    {t('opportunities:form.benefitsAr')}
                  </Label>
                  <Textarea
                    id="benefits_ar"
                    dir="rtl"
                    rows={4}
                    placeholder={t('opportunities:form.benefitsArPlaceholder')}
                    aria-invalid={!!getFieldError('benefits_ar_text')}
                    className="mt-1 resize-y"
                    {...register('benefits_ar_text', {
                      onChange: () => {
                        if (getFieldError('benefits_ar_text')) clearErrors('benefits_ar_text');
                        if (isSubmitted) trigger('benefits_en_text');
                      },
                    })}
                  />
                  {getFieldError('benefits_ar_text') && (
                    <p className="text-xs text-destructive font-medium mt-1">
                      {getFieldError('benefits_ar_text')}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="benefits_en" className="text-xs font-medium">
                    {t('opportunities:form.benefitsEn')}
                  </Label>
                  <Textarea
                    id="benefits_en"
                    dir="ltr"
                    rows={4}
                    placeholder={t('opportunities:form.benefitsEnPlaceholder')}
                    aria-invalid={!!getFieldError('benefits_en_text')}
                    className="mt-1 resize-y"
                    {...register('benefits_en_text', {
                      onChange: () => {
                        if (getFieldError('benefits_en_text')) clearErrors('benefits_en_text');
                        if (isSubmitted) trigger('benefits_en_text');
                      },
                    })}
                  />
                  {getFieldError('benefits_en_text') && (
                    <p className="text-xs text-destructive font-medium mt-1">
                      {getFieldError('benefits_en_text')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={isUpdating}
              className="cursor-pointer"
            >
              {t('opportunities:form.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isUpdating}
              className="bg-university-primary hover:bg-university-secondary text-white cursor-pointer"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2 rtl:mr-0 rtl:ml-2" />
                  {t('opportunities:form.saving')}
                </>
              ) : (
                t('opportunities:saveChanges', 'Save Changes')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditOpportunityDialog;
