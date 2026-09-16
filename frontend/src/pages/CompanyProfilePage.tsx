import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Globe,
  Users,
  Briefcase,
  Calendar,
  Edit2,
  Save,
  X,
  Camera,
  AlertTriangle,
  Clock,
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  fetchCompanyProfile,
  updateCompanyProfile,
  uploadCompanyLogo,
  resetCompanyUpdateStatus,
  resetCompanyLogoStatus,
  clearCompanyErrors,
} from '@/store/slices/companySlice';
import { fetchIndustries } from '@/store/slices/lookupSlice';
import { useToast } from '@/context/ToastContext';
import { type CompanyData, type CompanyStatus } from '@/types/company';
import {
  createUpdateCompanyProfileSchema,
  type UpdateCompanyProfileFormValues,
} from '@/lib/validations/company';

export const CompanyProfilePage: React.FC = () => {
  const { t, i18n } = useTranslation(['companies', 'common']);
  const isArabic = (i18n.language || 'ar') === 'ar';
  const dispatch = useAppDispatch();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    document.title = `${t('profile.title', 'ملف الشركة')} | ${t('common:pageTitleSuffix', 'منصة التدريب التعاوني')}`;
  }, [t, i18n.language]);

  const { company, profileStatus, profileError, updateStatus, updateValidationErrors, logoStatus } =
    useAppSelector((state) => state.company);

  const { industries } = useAppSelector((state) => state.lookup);

  const [isEditing, setIsEditing] = useState(false);

  const schema = useMemo(() => createUpdateCompanyProfileSchema(t), [t]);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    trigger,
    setValue,
    control,
    formState: { errors, isSubmitted },
  } = useForm<UpdateCompanyProfileFormValues>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      name_ar: '',
      name_en: '',
      description_ar: '',
      description_en: '',
      industry_id: '',
      registration_number: '',
      email: '',
      phone: '',
      website: '',
      address: '',
      city: '',
      established_year: '',
      employees_count: '',
    },
  });

  const watchedIndustryId = useWatch({ control, name: 'industry_id' });

  useEffect(() => {
    dispatch(fetchCompanyProfile());
    dispatch(fetchIndustries());
  }, [dispatch]);

  /** Build the editable snapshot from the latest company data. */
  const buildFormData = (data: CompanyData | null): UpdateCompanyProfileFormValues => {
    if (!data) {
      return {
        name_ar: '',
        name_en: '',
        description_ar: '',
        description_en: '',
        industry_id: '',
        registration_number: '',
        email: '',
        phone: '',
        website: '',
        address: '',
        city: '',
        established_year: '',
        employees_count: '',
      };
    }

    const getName = (lang: 'ar' | 'en') => {
      if (!data.name) return '';
      if (typeof data.name === 'string') return data.name;
      return data.name[lang] || '';
    };

    const getDesc = (lang: 'ar' | 'en') => {
      if (!data.description) return '';
      if (typeof data.description === 'string') return data.description;
      return data.description[lang] || '';
    };

    return {
      name_ar: getName('ar'),
      name_en: getName('en'),
      description_ar: getDesc('ar'),
      description_en: getDesc('en'),
      industry_id: data.industry_id ? String(data.industry_id) : '',
      registration_number: data.registration_number || '',
      email: data.contact_email || data.email || '',
      phone: data.phone || '',
      website: data.website || '',
      address: data.address || '',
      city: data.city || '',
      established_year: data.established_year ? String(data.established_year) : '',
      employees_count: data.employees_count || '',
    };
  };

  // Map server-side validation errors to react-hook-form fields
  useEffect(() => {
    if (updateValidationErrors && Object.keys(updateValidationErrors).length > 0) {
      Object.entries(updateValidationErrors).forEach(([field, messages]) => {
        if (messages && messages.length > 0) {
          setError(field as keyof UpdateCompanyProfileFormValues, {
            type: 'server',
            message: messages[0],
          });
        }
      });
    }
  }, [updateValidationErrors, setError]);

  // Re-trigger validation on language change if the form has already been submitted
  useEffect(() => {
    if (isSubmitted) {
      trigger();
    }
  }, [i18n.language, isSubmitted, trigger]);

  const getFieldError = (field: keyof UpdateCompanyProfileFormValues): string | undefined => {
    if (errors[field]?.message) return errors[field]?.message;
    const serverErr = updateValidationErrors?.[field];
    if (serverErr && serverErr.length > 0) {
      return serverErr[0];
    }
    return undefined;
  };

  const handleStartEditing = () => {
    dispatch(clearCompanyErrors());
    reset(buildFormData(company));
    setIsEditing(true);
  };

  const handleCancel = () => {
    dispatch(clearCompanyErrors());
    dispatch(resetCompanyUpdateStatus());
    reset(buildFormData(company));
    setIsEditing(false);
  };

  const onFormSubmit = async (values: UpdateCompanyProfileFormValues) => {
    dispatch(clearCompanyErrors());

    const result = await dispatch(
      updateCompanyProfile({
        name_ar: values.name_ar,
        name_en: values.name_en,
        description_ar: values.description_ar?.trim() || null,
        description_en: values.description_en?.trim() || null,
        industry_id: values.industry_id ? Number(values.industry_id) : null,
        registration_number: values.registration_number?.trim() || null,
        email: values.email?.trim() || null,
        phone: values.phone?.trim() || null,
        website: values.website?.trim() || null,
        address: values.address?.trim() || null,
        city: values.city?.trim() || null,
        established_year: values.established_year ? Number(values.established_year) : null,
        employees_count: values.employees_count?.trim() || null,
      })
    );

    if (updateCompanyProfile.fulfilled.match(result)) {
      setIsEditing(false);
      toast.success(result.payload.message || t('profile.successUpdated'));
      dispatch(resetCompanyUpdateStatus());
    } else if (updateCompanyProfile.rejected.match(result)) {
      toast.error(result.payload?.message || t('common:toast.error', 'Something went wrong'));
    }
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error(t('profile.logoTooLarge'));
        e.target.value = '';
        return;
      }
      void dispatch(uploadCompanyLogo(file)).then((result) => {
        if (uploadCompanyLogo.fulfilled.match(result)) {
          toast.success(result.payload.message || t('profile.logoSuccessUpdated'));
          dispatch(resetCompanyLogoStatus());
        } else if (uploadCompanyLogo.rejected.match(result)) {
          toast.error(result.payload?.message || t('common:toast.error', 'Something went wrong'));
          dispatch(resetCompanyLogoStatus());
        }
      });
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getLocalizedName = (nameObj: { en?: string; ar?: string } | string | undefined | null) => {
    if (!nameObj) return '';
    if (typeof nameObj === 'string') return nameObj;
    return isArabic ? nameObj.ar || nameObj.en || '' : nameObj.en || nameObj.ar || '';
  };

  const getLocalizedIndustry = (targetId?: string | number | null) => {
    const idToFind = targetId !== undefined ? targetId : company?.industry_id;
    if (idToFind) {
      const matched = industries.find((i) => String(i.id) === String(idToFind));
      if (matched?.name) {
        return getLocalizedName(matched.name);
      }
    }
    if (
      company?.industry?.name &&
      (targetId === undefined || String(targetId) === String(company.industry_id))
    ) {
      return getLocalizedName(company.industry.name);
    }
    return targetId !== undefined && idToFind ? '' : t('profile.notSet');
  };

  const getStatusBadge = (status: CompanyStatus | undefined) => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 gap-1.5 py-1 px-3">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {t('profile.status.approved')}
          </Badge>
        );
      case 'changes_requested':
        return (
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1.5 py-1 px-3">
            <AlertTriangle className="w-3.5 h-3.5" />
            {t('profile.status.changes_requested')}
          </Badge>
        );
      case 'pending_verification':
        return (
          <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 gap-1.5 py-1 px-3">
            <Clock className="w-3.5 h-3.5" />
            {t('profile.status.pending_verification')}
          </Badge>
        );
      case 'under_review':
        return (
          <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 gap-1.5 py-1 px-3">
            <Clock className="w-3.5 h-3.5" />
            {t('profile.status.under_review')}
          </Badge>
        );
      case 'suspended':
        return (
          <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 gap-1.5 py-1 px-3">
            <ShieldAlert className="w-3.5 h-3.5" />
            {t('profile.status.suspended')}
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 gap-1.5 py-1 px-3">
            <X className="w-3.5 h-3.5" />
            {t('profile.status.rejected')}
          </Badge>
        );
      default:
        return null;
    }
  };

  const yearsOfExp = company?.established_year
    ? Math.max(0, new Date().getFullYear() - Number(company.established_year))
    : null;

  const stats = [
    {
      label: t('profile.stats.availableOpportunities'),
      value: String(
        company?.stats?.available_opportunities ?? company?.available_opportunities_count ?? 0
      ),
      icon: Briefcase,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950/40',
    },
    {
      label: t('profile.stats.acceptedStudents'),
      value: String(company?.stats?.accepted_students ?? company?.accepted_students_count ?? 0),
      icon: Users,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
    },
    {
      label: t('profile.stats.yearsOfExperience'),
      value: yearsOfExp !== null ? String(yearsOfExp) : t('profile.stats.notSpecified'),
      icon: Calendar,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-950/40',
    },
  ];

  if (profileStatus === 'loading' && !company) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3 text-foreground-muted">
            <RefreshCw className="w-8 h-8 animate-spin text-university-primary" />
            <p className="text-sm font-medium">{t('profile.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (profileStatus === 'failed' && !company) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <Card className="border-border">
          <CardContent className="p-12 text-center space-y-4">
            <Building2 className="w-12 h-12 mx-auto text-foreground-muted opacity-40" />
            <h2 className="text-xl font-bold text-foreground">
              {profileError || t('profile.noCompany')}
            </h2>
            <Button
              onClick={() => dispatch(fetchCompanyProfile())}
              className="gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              {t('profile.retry')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div dir={isArabic ? 'rtl' : 'ltr'} className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* ── Status Alerts & Banners ────────────────────────────────────────── */}
      {company?.status === 'changes_requested' && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-xl border border-amber-500/40 bg-amber-50/80 dark:bg-amber-950/30 p-4 sm:p-5 text-amber-900 dark:text-amber-200 shadow-xs transition-all"
        >
          <div className="flex items-start gap-3.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-semibold text-sm sm:text-base">
                {t('profile.status.changesRequestedAlertTitle')}
              </h4>
              <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
                {company.status_reason || t('profile.status.underReviewAlert')}
              </p>
            </div>
          </div>
        </div>
      )}

      {company?.status === 'under_review' && (
        <div
          role="status"
          className="rounded-xl border border-purple-500/30 bg-purple-50/80 dark:bg-purple-950/30 p-4 text-purple-900 dark:text-purple-200 shadow-xs"
        >
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0" />
            <p className="text-sm font-medium">{t('profile.status.underReviewAlert')}</p>
          </div>
        </div>
      )}

      {company?.status === 'pending_verification' && (
        <div
          role="status"
          className="rounded-xl border border-blue-500/30 bg-blue-50/80 dark:bg-blue-950/30 p-4 text-blue-900 dark:text-blue-200 shadow-xs"
        >
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
            <p className="text-sm font-medium">{t('profile.status.pendingVerificationAlert')}</p>
          </div>
        </div>
      )}

      {company?.status === 'suspended' && (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/40 bg-rose-50/80 dark:bg-rose-950/30 p-4 text-rose-900 dark:text-rose-200 shadow-xs"
        >
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            <p className="text-sm font-medium">{t('profile.status.suspendedAlert')}</p>
          </div>
        </div>
      )}

      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {t('profile.title')}
            </h1>
            {getStatusBadge(company?.status)}
          </div>
          <p className="text-sm text-foreground-muted mt-1">{t('profile.subtitle')}</p>
        </div>

        {!isEditing ? (
          <Button
            onClick={handleStartEditing}
            className="gap-2 cursor-pointer shrink-0 self-start sm:self-auto bg-university-primary hover:bg-university-secondary text-white transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            {t('profile.editProfile')}
          </Button>
        ) : (
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            <Button
              type="button"
              onClick={() => formRef.current?.requestSubmit()}
              disabled={updateStatus === 'loading'}
              className="gap-2 cursor-pointer bg-university-primary hover:bg-university-secondary text-white transition-colors"
            >
              {updateStatus === 'loading' ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {updateStatus === 'loading' ? t('profile.saving') : t('profile.saveChanges')}
            </Button>
            <Button
              type="button"
              onClick={handleCancel}
              disabled={updateStatus === 'loading'}
              variant="outline"
              className="gap-2 cursor-pointer border-border hover:bg-surface-hover"
            >
              <X className="w-4 h-4" />
              {t('profile.cancel')}
            </Button>
          </div>
        )}
      </div>

      {/* ── Statistics Cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="border-border shadow-xs">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium text-foreground-muted">
                    {stat.label}
                  </p>
                  <p className={`text-xl sm:text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.bgColor} ${stat.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Main Profile Form / Details ────────────────────────────────────── */}
      <form ref={formRef} onSubmit={handleSubmit(onFormSubmit)} noValidate className="space-y-6">
        {/* Basic Information Card */}
        <Card className="border-border shadow-xs">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold">
              <Building2 className="w-5 h-5 text-university-primary" />
              {t('profile.basicInfo')}
            </CardTitle>
            <CardDescription>{t('profile.basicInfoDesc')}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Logo and Identification Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 p-4 rounded-xl bg-surface-secondary/50 border border-border/60">
              <div className="relative group shrink-0">
                <Avatar className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 border-border shadow-xs bg-surface">
                  <AvatarImage
                    src={company?.logo_url || company?.logo || undefined}
                    alt={getLocalizedName(company?.name)}
                    className="object-cover"
                  />
                  <AvatarFallback className="rounded-2xl bg-university-primary/10 text-university-primary font-bold">
                    <Building2 className="w-10 h-10" />
                  </AvatarFallback>
                </Avatar>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleLogoSelect}
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  aria-label={t('profile.uploadLogo')}
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={logoStatus === 'loading'}
                  className="absolute inset-0 bg-black/50 text-white rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                  title={t('profile.uploadLogo')}
                >
                  {logoStatus === 'loading' ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Camera className="w-5 h-5" />
                      <span className="text-[10px] font-medium">{t('profile.uploadLogo')}</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-foreground truncate">
                    {getLocalizedName(company?.name) || t('profile.notSet')}
                  </h3>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="font-normal text-xs">
                    {getLocalizedIndustry()}
                  </Badge>
                  {company?.registration_number && (
                    <span className="text-xs text-foreground-muted flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" />
                      {company.registration_number}
                    </span>
                  )}
                </div>
                <p className="text-xs text-foreground-muted">{t('profile.logoHint')}</p>
              </div>
            </div>

            {/* Bilingual Name Inputs — only shown in edit mode */}
            {isEditing && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label htmlFor="name_ar" className="text-foreground" required>
                    {t('profile.companyNameAr')}
                  </Label>
                  <Input
                    id="name_ar"
                    dir="rtl"
                    aria-invalid={!!getFieldError('name_ar')}
                    placeholder={t('profile.companyNameArPlaceholder')}
                    className="border-border bg-surface"
                    {...register('name_ar', {
                      onChange: () => {
                        if (getFieldError('name_ar')) clearErrors('name_ar');
                      },
                    })}
                  />
                  {getFieldError('name_ar') && (
                    <p className="text-xs text-destructive font-medium mt-1">
                      {getFieldError('name_ar')}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="name_en" className="text-foreground" required>
                    {t('profile.companyNameEn')}
                  </Label>
                  <Input
                    id="name_en"
                    dir="ltr"
                    aria-invalid={!!getFieldError('name_en')}
                    placeholder={t('profile.companyNameEnPlaceholder')}
                    className="border-border bg-surface"
                    {...register('name_en', {
                      onChange: () => {
                        if (getFieldError('name_en')) clearErrors('name_en');
                      },
                    })}
                  />
                  {getFieldError('name_en') && (
                    <p className="text-xs text-destructive font-medium mt-1">
                      {getFieldError('name_en')}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Industry & Commercial Registration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="industry" className="text-foreground">
                  {t('profile.industry')}
                </Label>
                {isEditing ? (
                  <>
                    <Select
                      value={watchedIndustryId}
                      onValueChange={(val) => {
                        setValue('industry_id', val, { shouldValidate: isSubmitted });
                        if (getFieldError('industry_id')) clearErrors('industry_id');
                      }}
                    >
                      <SelectTrigger
                        id="industry"
                        aria-invalid={!!getFieldError('industry_id')}
                        className="border-border bg-surface cursor-pointer"
                      >
                        <SelectValue placeholder={t('profile.selectIndustry')}>
                          {watchedIndustryId ? getLocalizedIndustry(watchedIndustryId) : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="bg-surface border-border">
                        {industries.map((ind) => (
                          <SelectItem
                            key={ind.id}
                            value={String(ind.id)}
                            className="cursor-pointer hover:bg-surface-hover"
                          >
                            {getLocalizedName(ind.name)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {getFieldError('industry_id') && (
                      <p className="text-xs text-destructive font-medium mt-1">
                        {getFieldError('industry_id')}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm font-medium text-foreground py-2">
                    {getLocalizedIndustry()}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="registration_number" className="text-foreground">
                  {t('profile.registrationNumber')}
                </Label>
                {isEditing ? (
                  <>
                    <Input
                      id="registration_number"
                      dir="ltr"
                      aria-invalid={!!getFieldError('registration_number')}
                      placeholder={t('profile.registrationNumberPlaceholder')}
                      className="border-border bg-surface"
                      {...register('registration_number', {
                        onChange: () => {
                          if (getFieldError('registration_number'))
                            clearErrors('registration_number');
                        },
                      })}
                    />
                    {getFieldError('registration_number') && (
                      <p className="text-xs text-destructive font-medium mt-1">
                        {getFieldError('registration_number')}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm font-medium text-foreground py-2 dir-ltr text-start">
                    {company?.registration_number || t('profile.notSet')}
                  </p>
                )}
              </div>
            </div>

            <Separator />

            {/* Bilingual Description */}
            {isEditing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <Label htmlFor="description_ar" className="text-foreground">
                    {t('profile.descriptionAr')}
                  </Label>
                  <Textarea
                    id="description_ar"
                    dir="rtl"
                    aria-invalid={!!getFieldError('description_ar')}
                    placeholder={t('profile.descriptionArPlaceholder')}
                    rows={4}
                    className="border-border bg-surface resize-none"
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

                <div className="space-y-1.5">
                  <Label htmlFor="description_en" className="text-foreground">
                    {t('profile.descriptionEn')}
                  </Label>
                  <Textarea
                    id="description_en"
                    dir="ltr"
                    aria-invalid={!!getFieldError('description_en')}
                    placeholder={t('profile.descriptionEnPlaceholder')}
                    rows={4}
                    className="border-border bg-surface resize-none"
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
            ) : (
              <div className="space-y-2">
                <Label className="text-foreground">{t('profile.descriptionAr')}</Label>
                <p className="text-sm text-foreground-muted leading-relaxed whitespace-pre-line bg-surface-secondary/30 p-4 rounded-xl border border-border/50">
                  {getLocalizedName(company?.description) || t('profile.notSet')}
                </p>
              </div>
            )}

            <Separator />

            {/* Established Year and Employees Count */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="established_year" className="text-foreground">
                  {t('profile.establishedYear')}
                </Label>
                {isEditing ? (
                  <>
                    <Input
                      id="established_year"
                      type="number"
                      min="1900"
                      max={new Date().getFullYear()}
                      aria-invalid={!!getFieldError('established_year')}
                      placeholder={t('profile.establishedYearPlaceholder')}
                      className="border-border bg-surface"
                      {...register('established_year', {
                        onChange: () => {
                          if (getFieldError('established_year')) clearErrors('established_year');
                        },
                      })}
                    />
                    {getFieldError('established_year') && (
                      <p className="text-xs text-destructive font-medium mt-1">
                        {getFieldError('established_year')}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm font-medium text-foreground py-2">
                    {company?.established_year || t('profile.notSet')}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="employees_count" className="text-foreground">
                  {t('profile.employeesCount')}
                </Label>
                {isEditing ? (
                  <>
                    <Input
                      id="employees_count"
                      aria-invalid={!!getFieldError('employees_count')}
                      placeholder={t('profile.employeesCountPlaceholder')}
                      className="border-border bg-surface"
                      {...register('employees_count', {
                        onChange: () => {
                          if (getFieldError('employees_count')) clearErrors('employees_count');
                        },
                      })}
                    />
                    {getFieldError('employees_count') && (
                      <p className="text-xs text-destructive font-medium mt-1">
                        {getFieldError('employees_count')}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm font-medium text-foreground py-2">
                    {company?.employees_count || t('profile.notSet')}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information Card */}
        <Card className="border-border shadow-xs">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl font-bold">
              <Phone className="w-5 h-5 text-university-primary" />
              {t('profile.contactInfo')}
            </CardTitle>
            <CardDescription>{t('profile.contactInfoDesc')}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="flex items-center gap-2 text-foreground">
                  <Mail className="w-4 h-4 text-foreground-muted" />
                  {t('profile.email')}
                </Label>
                {isEditing ? (
                  <>
                    <Input
                      id="email"
                      type="email"
                      dir="ltr"
                      aria-invalid={!!getFieldError('email')}
                      placeholder={t('profile.emailPlaceholder')}
                      className="border-border bg-surface"
                      {...register('email', {
                        onChange: () => {
                          if (getFieldError('email')) clearErrors('email');
                        },
                      })}
                    />
                    {getFieldError('email') && (
                      <p className="text-xs text-destructive font-medium mt-1">
                        {getFieldError('email')}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm font-medium text-foreground py-2 dir-ltr text-start">
                    {company?.contact_email || company?.email || t('profile.notSet')}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="flex items-center gap-2 text-foreground">
                  <Phone className="w-4 h-4 text-foreground-muted" />
                  {t('profile.phone')}
                </Label>
                {isEditing ? (
                  <>
                    <Input
                      id="phone"
                      dir="ltr"
                      aria-invalid={!!getFieldError('phone')}
                      placeholder={t('profile.phonePlaceholder')}
                      className="border-border bg-surface"
                      {...register('phone', {
                        onChange: () => {
                          if (getFieldError('phone')) clearErrors('phone');
                        },
                      })}
                    />
                    {getFieldError('phone') && (
                      <p className="text-xs text-destructive font-medium mt-1">
                        {getFieldError('phone')}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm font-medium text-foreground py-2 dir-ltr text-start">
                    {company?.phone || t('profile.notSet')}
                  </p>
                )}
              </div>

              {/* Website */}
              <div className="space-y-1.5">
                <Label htmlFor="website" className="flex items-center gap-2 text-foreground">
                  <Globe className="w-4 h-4 text-foreground-muted" />
                  {t('profile.website')}
                </Label>
                {isEditing ? (
                  <>
                    <Input
                      id="website"
                      type="url"
                      dir="ltr"
                      aria-invalid={!!getFieldError('website')}
                      placeholder={t('profile.websitePlaceholder')}
                      className="border-border bg-surface"
                      {...register('website', {
                        onChange: () => {
                          if (getFieldError('website')) clearErrors('website');
                        },
                      })}
                    />
                    {getFieldError('website') && (
                      <p className="text-xs text-destructive font-medium mt-1">
                        {getFieldError('website')}
                      </p>
                    )}
                  </>
                ) : (
                  <div className="py-2">
                    {company?.website ? (
                      <a
                        href={
                          company.website.startsWith('http')
                            ? company.website
                            : `https://${company.website}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-university-primary hover:underline dir-ltr inline-block cursor-pointer"
                      >
                        {company.website}
                      </a>
                    ) : (
                      <p className="text-sm text-foreground-muted">{t('profile.notSet')}</p>
                    )}
                  </div>
                )}
              </div>

              {/* City */}
              <div className="space-y-1.5">
                <Label htmlFor="city" className="flex items-center gap-2 text-foreground">
                  <MapPin className="w-4 h-4 text-foreground-muted" />
                  {t('profile.city')}
                </Label>
                {isEditing ? (
                  <>
                    <Input
                      id="city"
                      aria-invalid={!!getFieldError('city')}
                      placeholder={t('profile.cityPlaceholder')}
                      className="border-border bg-surface"
                      {...register('city', {
                        onChange: () => {
                          if (getFieldError('city')) clearErrors('city');
                        },
                      })}
                    />
                    {getFieldError('city') && (
                      <p className="text-xs text-destructive font-medium mt-1">
                        {getFieldError('city')}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm font-medium text-foreground py-2">
                    {company?.city || t('profile.notSet')}
                  </p>
                )}
              </div>

              {/* Address */}
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="address" className="flex items-center gap-2 text-foreground">
                  <MapPin className="w-4 h-4 text-foreground-muted" />
                  {t('profile.address')}
                </Label>
                {isEditing ? (
                  <>
                    <Input
                      id="address"
                      aria-invalid={!!getFieldError('address')}
                      placeholder={t('profile.addressPlaceholder')}
                      className="border-border bg-surface"
                      {...register('address', {
                        onChange: () => {
                          if (getFieldError('address')) clearErrors('address');
                        },
                      })}
                    />
                    {getFieldError('address') && (
                      <p className="text-xs text-destructive font-medium mt-1">
                        {getFieldError('address')}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm font-medium text-foreground py-2">
                    {company?.address || t('profile.notSet')}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default CompanyProfilePage;
