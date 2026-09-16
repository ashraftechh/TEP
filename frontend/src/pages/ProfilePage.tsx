import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  fetchProfile,
  updateProfile,
  uploadAvatar,
  attachSkill,
  detachSkill,
  unlinkSso,
  clearProfileErrors,
} from '@/store/slices/profileSlice';
import { fetchSkills } from '@/store/slices/lookupSlice';
import { useToast } from '@/context/ToastContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StudentPortfolioSection } from '@/components/profile/StudentPortfolioSection';
import { LinkedAccountsCard } from '@/components/profile/LinkedAccountsCard';
import { ChangePasswordCard } from '@/components/profile/ChangePasswordCard';
import {
  User,
  GraduationCap,
  Building2,
  BookOpen,
  Edit3,
  Save,
  X,
  Shield,
  Camera,
  Loader2,
} from 'lucide-react';
import { createProfileSchema, type ProfileFormValues } from '@/lib/validations/profile';
import { type UpdateProfilePayload } from '@/types/profile';

export const ProfilePage: React.FC = () => {
  const { t, i18n } = useTranslation(['profile', 'auth', 'common']);
  const isArabic = i18n.language === 'ar';
  const dispatch = useAppDispatch();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const { profile, updateStatus, avatarStatus, skillStatus, ssoStatus, validationErrors } =
    useAppSelector((state) => state.profile);

  const isAvatarUploading = avatarStatus === 'loading';
  const { skills: availableSkills } = useAppSelector((state) => state.lookup);

  const [isEditing, setIsEditing] = useState(false);

  // Portfolio array state (interests, languages, achievements)
  const [portfolioData, setPortfolioData] = useState<{
    interests: string[];
    languages: string[];
    achievements: string[];
  }>({
    interests: [],
    languages: [],
    achievements: [],
  });

  const schema = useMemo(() => createProfileSchema(t), [t]);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    trigger,
    formState: { errors, isSubmitted },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      name: '',
      phone: '',
      job_title: '',
      bio: '',
      address: '',
      expected_graduation: '',
    },
  });

  useEffect(() => {
    dispatch(fetchProfile());
    dispatch(fetchSkills());
  }, [dispatch]);

  useEffect(() => {
    document.title = `${t('profile.title')} | ${t('common:pageTitleSuffix', 'منصة التدريب التعاوني')}`;
  }, [t, isArabic]);

  /** Build the editable snapshot from the latest profile data. */
  const buildFormData = (p: typeof profile): ProfileFormValues => ({
    name: p?.name || '',
    phone: p?.phone || '',
    job_title: p?.company_representative?.job_title || '',
    bio: p?.student_profile?.bio || '',
    address: p?.student_profile?.address || '',
    expected_graduation: p?.student_profile?.expected_graduation || '',
  });

  // Map server-side validation errors to react-hook-form fields
  useEffect(() => {
    if (validationErrors && Object.keys(validationErrors).length > 0) {
      Object.entries(validationErrors).forEach(([field, messages]) => {
        if (messages && messages.length > 0) {
          setError(field as keyof ProfileFormValues, {
            type: 'server',
            message: messages[0],
          });
        }
      });
    }
  }, [validationErrors, setError]);

  // Re-trigger validation on language change if the form has already been submitted
  useEffect(() => {
    if (isSubmitted) {
      trigger();
    }
  }, [i18n.language, isSubmitted, trigger]);

  const getFieldError = (field: keyof ProfileFormValues): string | undefined => {
    if (errors[field]?.message) return errors[field]?.message;
    const serverErr = validationErrors?.[field];
    if (serverErr && serverErr.length > 0) {
      return serverErr[0];
    }
    return undefined;
  };

  const handleStartEdit = () => {
    dispatch(clearProfileErrors());
    reset(buildFormData(profile));
    setPortfolioData({
      interests: profile?.student_profile?.interests || [],
      languages: profile?.student_profile?.languages || [],
      achievements: profile?.student_profile?.achievements || [],
    });
    setIsEditing(true);
  };

  const handleCancel = () => {
    dispatch(clearProfileErrors());
    reset(buildFormData(profile));
    setPortfolioData({
      interests: profile?.student_profile?.interests || [],
      languages: profile?.student_profile?.languages || [],
      achievements: profile?.student_profile?.achievements || [],
    });
    setIsEditing(false);
  };

  const onFormSubmit = async (values: ProfileFormValues) => {
    dispatch(clearProfileErrors());

    const payload: UpdateProfilePayload = {
      name: values.name.trim(),
      phone: values.phone?.trim() || undefined,
      job_title: values.job_title?.trim() || undefined,
      bio: values.bio?.trim() || undefined,
      address: values.address?.trim() || undefined,
      expected_graduation: values.expected_graduation || undefined,
      interests: portfolioData.interests,
      languages: portfolioData.languages,
      achievements: portfolioData.achievements,
    };

    const result = await dispatch(updateProfile(payload));
    if (updateProfile.fulfilled.match(result)) {
      setIsEditing(false);
      toast.success(
        result.payload.message || t('profile.updatedSuccess', 'Profile updated successfully!')
      );
    }
  };

  const handleAttachSkill = (skillId: number, proficiency: string) => {
    dispatch(attachSkill({ skill_id: skillId, proficiency }));
  };

  const handleDetachSkill = (skillId: number) => {
    dispatch(detachSkill(skillId));
  };

  const handleUnlinkSso = (provider: string) => {
    dispatch(unlinkSso(provider));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error(
          isArabic ? 'حجم الصورة يجب ألا يتجاوز 2 ميجابايت' : 'Image size must not exceed 2MB'
        );
        return;
      }
      dispatch(uploadAvatar(file));
      // Reset input value so same file can be re-selected if needed
      e.target.value = '';
    }
  };

  const handleAddInterest = (item: string) => {
    if (item && !portfolioData.interests.includes(item)) {
      setPortfolioData((prev) => ({
        ...prev,
        interests: [...prev.interests, item],
      }));
    }
  };

  const handleRemoveInterest = (index: number) => {
    setPortfolioData((prev) => ({
      ...prev,
      interests: prev.interests.filter((_, i) => i !== index),
    }));
  };

  const handleAddLanguage = (item: string) => {
    if (item && !portfolioData.languages.includes(item)) {
      setPortfolioData((prev) => ({
        ...prev,
        languages: [...prev.languages, item],
      }));
    }
  };

  const handleRemoveLanguage = (index: number) => {
    setPortfolioData((prev) => ({
      ...prev,
      languages: prev.languages.filter((_, i) => i !== index),
    }));
  };

  const handleAddAchievement = (item: string) => {
    if (item && !portfolioData.achievements.includes(item)) {
      setPortfolioData((prev) => ({
        ...prev,
        achievements: [...prev.achievements, item],
      }));
    }
  };

  const handleRemoveAchievement = (index: number) => {
    setPortfolioData((prev) => ({
      ...prev,
      achievements: prev.achievements.filter((_, i) => i !== index),
    }));
  };

  const primaryRole = profile?.roles?.[0]?.name || 'student';
  const isStudent = !!profile?.student_profile || primaryRole === 'student';
  const isSupervisor =
    !!profile?.academic_supervisor_profile || primaryRole === 'academic_supervisor';
  const isCoordinator =
    !!profile?.training_coordinator_profile || primaryRole === 'training_coordinator';
  const isCompanyRep =
    !!profile?.company_representative || primaryRole === 'company_representative';

  const getLocalizedName = (name: string | { ar?: string; en?: string } | undefined) => {
    if (!name) return '';
    if (typeof name === 'string') return name;
    return isArabic ? name.ar || name.en || '' : name.en || name.ar || '';
  };

  const initials = profile?.name
    ? profile.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'U';

  return (
    <div dir={isArabic ? 'rtl' : 'ltr'} className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            {t('profile.title')}
          </h1>
          <p className="text-sm text-foreground-muted">{t('profile.subtitle')}</p>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          {/* Edit / Save / Cancel controls */}
          {isEditing ? (
            <>
              <Button
                type="button"
                onClick={() => formRef.current?.requestSubmit()}
                disabled={updateStatus === 'loading'}
                className="bg-university-primary hover:bg-university-secondary text-white text-xs h-9 px-4 cursor-pointer shadow-sm"
              >
                {updateStatus === 'loading' ? (
                  <Loader2 className="h-4 w-4 animate-spin ltr:mr-1.5 rtl:ml-1.5" />
                ) : (
                  <Save className="h-4 w-4 ltr:mr-1.5 rtl:ml-1.5" />
                )}
                {updateStatus === 'loading' ? t('profile.saving') : t('profile.save')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={updateStatus === 'loading'}
                className="text-xs h-9 px-3.5 cursor-pointer border-border"
              >
                <X className="h-4 w-4 ltr:mr-1.5 rtl:ml-1.5" />
                {t('profile.cancel')}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={handleStartEdit}
              className="text-xs h-9 px-4 cursor-pointer border-border bg-surface hover:bg-surface-hover shadow-xs"
            >
              <Edit3 className="h-4 w-4 ltr:mr-1.5 rtl:ml-1.5 text-university-primary" />
              {t('profile.edit')}
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Grid — form wraps right column only to avoid nested-form issues */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Avatar, Linked Accounts & Change Password */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="bg-surface border-border shadow-sm text-center">
            <CardContent className="p-6">
              {/* Interactive Avatar with Hover Upload Overlay */}
              <div className="relative w-24 h-24 mx-auto mb-4 group">
                <Avatar className="w-24 h-24 border-2 border-university-primary/20 shadow-md">
                  {profile?.avatar_url && (
                    <AvatarImage
                      src={profile.avatar_url}
                      alt={profile.name}
                      className="object-cover"
                    />
                  )}
                  <AvatarFallback className="text-2xl font-bold bg-university-primary/10 text-university-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                {/* Upload overlay button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isAvatarUploading}
                  aria-label={isArabic ? 'تغيير الصورة الشخصية' : 'Change profile picture'}
                  className="absolute inset-0 rounded-full bg-black/50 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isAvatarUploading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      <Camera className="w-6 h-6 mb-0.5" />
                      <span className="text-[10px] font-medium">
                        {isArabic ? 'تغيير' : 'Change'}
                      </span>
                    </>
                  )}
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,image/webp"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>

              <h2 className="text-lg font-bold text-foreground mb-1">{profile?.name || 'User'}</h2>
              <p className="text-xs text-foreground-muted mb-3 font-mono">{profile?.email}</p>

              <div className="flex flex-wrap items-center justify-center gap-1.5 mb-4">
                {profile?.roles?.map((r) => (
                  <Badge key={r.id} variant="secondary" className="text-xs py-0.5 px-2.5">
                    {getLocalizedName(r.label) || r.name}
                  </Badge>
                ))}
                <Badge
                  variant={
                    profile?.status === 'active'
                      ? 'success'
                      : profile?.status === 'suspended'
                        ? 'destructive'
                        : 'secondary'
                  }
                  className="text-xs py-0.5 px-2.5"
                >
                  {profile?.status
                    ? t(`profile.userStatuses.${profile.status}`, profile.status)
                    : '-'}
                </Badge>
              </div>

              {/* Student Bio */}
              {isStudent && (
                <div className="text-start pt-3 border-t border-border">
                  <Label
                    htmlFor="bio"
                    className="text-xs font-semibold text-foreground-muted block mb-1.5"
                  >
                    {t('profile.bio')}
                  </Label>
                  {isEditing ? (
                    <div>
                      <Textarea
                        id="bio"
                        placeholder={t('profile.bioPlaceholder')}
                        aria-invalid={!!getFieldError('bio')}
                        className="text-xs resize-none"
                        rows={4}
                        {...register('bio', {
                          onChange: () => {
                            if (getFieldError('bio')) clearErrors('bio');
                          },
                        })}
                      />
                      {getFieldError('bio') && (
                        <p className="text-xs text-destructive font-medium mt-1">
                          {getFieldError('bio')}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-foreground leading-relaxed p-2.5 rounded-lg bg-surface-secondary/50 border border-border/60 min-h-17.5">
                      {profile?.student_profile?.bio || (
                        <span className="text-foreground-muted italic">
                          {t('profile.emptyState')}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Linked Accounts */}
          <LinkedAccountsCard
            ssoIdentities={profile?.sso_identities}
            hasPassword={profile?.has_password ?? true}
            onUnlink={handleUnlinkSso}
            isUnlinking={ssoStatus === 'loading'}
          />

          {/* Change Password Card */}
          <ChangePasswordCard />
        </div>

        {/* Right Column: Main Profile Information — wrapped in form */}
        <div className="lg:col-span-2 space-y-6">
          <form
            ref={formRef}
            onSubmit={handleSubmit(onFormSubmit)}
            noValidate
            className="space-y-6"
          >
            {/* Basic Information Card */}
            <Card className="bg-surface border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                  <User className="h-5 w-5 text-university-primary" />
                  {t('profile.basicInfo')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div>
                    <Label
                      htmlFor="profile-name"
                      className="text-xs font-medium"
                      required={isEditing}
                    >
                      {t('profile.name')}
                    </Label>
                    {isEditing ? (
                      <div>
                        <Input
                          id="profile-name"
                          aria-invalid={!!getFieldError('name')}
                          className="text-xs h-9 mt-1"
                          {...register('name', {
                            onChange: () => {
                              if (getFieldError('name')) clearErrors('name');
                            },
                          })}
                        />
                        {getFieldError('name') && (
                          <p className="text-xs text-destructive font-medium mt-1">
                            {getFieldError('name')}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="p-2 text-xs bg-surface-secondary rounded-lg border border-border text-foreground font-medium mt-1">
                        {profile?.name}
                      </p>
                    )}
                  </div>

                  {/* Email Address (Read-only) */}
                  <div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="profile-email" className="text-xs font-medium">
                        {t('profile.email')}
                      </Label>
                      <span className="text-[10px] text-foreground-muted italic">
                        {t('profile.emailNote')}
                      </span>
                    </div>
                    <p className="p-2 text-xs bg-surface-secondary/70 rounded-lg border border-border text-foreground-muted font-mono mt-1 select-all">
                      {profile?.email}
                    </p>
                  </div>

                  {/* Phone Number */}
                  <div>
                    <Label htmlFor="profile-phone" className="text-xs font-medium">
                      {t('profile.phone')}
                    </Label>
                    {isEditing ? (
                      <div>
                        <Input
                          id="profile-phone"
                          type="tel"
                          dir="ltr"
                          placeholder={t('profile.phonePlaceholder', '+967 770 000 000')}
                          aria-invalid={!!getFieldError('phone')}
                          className={`text-xs h-9 mt-1 font-mono ${isArabic ? 'text-right' : 'text-left'} [direction:ltr]`}
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
                      </div>
                    ) : (
                      <p
                        dir="ltr"
                        className={`p-2 text-xs bg-surface-secondary rounded-lg border border-border text-foreground font-mono mt-1 ${isArabic ? 'text-right' : 'text-left'} [direction:ltr]`}
                      >
                        {profile?.phone || '-'}
                      </p>
                    )}
                  </div>

                  {/* Address (Student-only) */}
                  {isStudent && (
                    <div>
                      <Label htmlFor="profile-address" className="text-xs font-medium">
                        {t('profile.address')}
                      </Label>
                      {isEditing ? (
                        <div>
                          <Input
                            id="profile-address"
                            aria-invalid={!!getFieldError('address')}
                            className="text-xs h-9 mt-1"
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
                        </div>
                      ) : (
                        <p className="p-2 text-xs bg-surface-secondary rounded-lg border border-border text-foreground mt-1">
                          {profile?.student_profile?.address || '-'}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Academic Information (Student View) */}
            {isStudent && (
              <Card className="bg-surface border-border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                    <GraduationCap className="h-5 w-5 text-university-primary" />
                    {t('profile.academicInfo')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Student ID (Read-only) */}
                    <div>
                      <Label className="text-xs font-medium">{t('profile.studentId')}</Label>
                      <p className="p-2 text-xs bg-surface-secondary/70 rounded-lg border border-border text-foreground font-mono font-semibold mt-1">
                        {profile?.student_profile?.student_number || '-'}
                      </p>
                    </div>

                    {/* Major (Read-only) */}
                    <div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">{t('profile.major')}</Label>
                        <span className="text-[10px] text-foreground-muted italic">
                          {t('profile.majorNote')}
                        </span>
                      </div>
                      <p className="p-2 text-xs bg-surface-secondary/70 rounded-lg border border-border text-foreground font-medium mt-1">
                        {getLocalizedName(profile?.student_profile?.major?.name) || '-'}
                      </p>
                    </div>

                    {/* GPA (Read-only) */}
                    <div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">{t('profile.gpa')}</Label>
                        <span className="text-[10px] text-foreground-muted italic">
                          {t('profile.gpaNote')}
                        </span>
                      </div>
                      <p className="p-2 text-xs bg-surface-secondary/70 rounded-lg border border-border font-mono font-bold mt-1 text-university-primary">
                        {profile?.student_profile?.gpa || '-'}
                      </p>
                    </div>

                    {/* Expected Graduation */}
                    <div>
                      <Label htmlFor="expected-grad" className="text-xs font-medium">
                        {t('profile.expectedGraduation')}
                      </Label>
                      {isEditing ? (
                        <div>
                          <Input
                            id="expected-grad"
                            type="date"
                            aria-invalid={!!getFieldError('expected_graduation')}
                            className="text-xs h-9 mt-1 cursor-pointer"
                            {...register('expected_graduation', {
                              onChange: () => {
                                if (getFieldError('expected_graduation'))
                                  clearErrors('expected_graduation');
                              },
                            })}
                          />
                          {getFieldError('expected_graduation') && (
                            <p className="text-xs text-destructive font-medium mt-1">
                              {getFieldError('expected_graduation')}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="p-2 text-xs bg-surface-secondary rounded-lg border border-border text-foreground mt-1">
                          {profile?.student_profile?.expected_graduation || '-'}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Department Information (Academic Supervisor / Coordinator View) */}
            {(isSupervisor || isCoordinator) && (
              <Card className="bg-surface border-border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                    <BookOpen className="h-5 w-5 text-university-primary" />
                    {t('profile.departmentInfo')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-medium">{t('profile.department')}</Label>
                      <p className="p-2 text-xs bg-surface-secondary/70 rounded-lg border border-border text-foreground font-medium mt-1">
                        {getLocalizedName(
                          profile?.academic_supervisor_profile?.department?.name ||
                            profile?.training_coordinator_profile?.department?.name
                        ) || '-'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium">{t('profile.departmentCode')}</Label>
                      <p className="p-2 text-xs bg-surface-secondary/70 rounded-lg border border-border text-foreground font-mono font-bold mt-1">
                        {profile?.academic_supervisor_profile?.department?.code ||
                          profile?.training_coordinator_profile?.department?.code ||
                          '-'}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-foreground-muted italic pt-1">
                    {t('profile.departmentNote')}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Company Information (Company Representative View) */}
            {isCompanyRep && (
              <Card className="bg-surface border-border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                    <Building2 className="h-5 w-5 text-university-primary" />
                    {t('profile.companyInfo')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs font-medium">{t('profile.companyName')}</Label>
                      <p className="p-2 text-xs bg-surface-secondary/70 rounded-lg border border-border text-foreground font-medium mt-1">
                        {getLocalizedName(profile?.company_representative?.company?.name) || '-'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium">{t('profile.companyStatus')}</Label>
                      <div className="mt-1">
                        {(() => {
                          const cs = profile?.company_representative?.company?.status;
                          const variant =
                            cs === 'approved'
                              ? 'success'
                              : cs === 'rejected' || cs === 'suspended'
                                ? 'destructive'
                                : 'secondary';
                          return (
                            <Badge variant={variant} className="text-xs py-1 px-3">
                              {cs ? t(`profile.companyStatuses.${cs}`, cs) : '-'}
                            </Badge>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Job Title (Editable) */}
                    <div className="md:col-span-2">
                      <Label htmlFor="rep-job-title" className="text-xs font-medium">
                        {t('profile.jobTitle')}
                      </Label>
                      {isEditing ? (
                        <div>
                          <Input
                            id="rep-job-title"
                            placeholder={
                              isArabic ? 'مثال: مدير الموارد البشرية' : 'e.g. HR Manager'
                            }
                            aria-invalid={!!getFieldError('job_title')}
                            className="text-xs h-9 mt-1"
                            {...register('job_title', {
                              onChange: () => {
                                if (getFieldError('job_title')) clearErrors('job_title');
                              },
                            })}
                          />
                          {getFieldError('job_title') && (
                            <p className="text-xs text-destructive font-medium mt-1">
                              {getFieldError('job_title')}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="p-2 text-xs bg-surface-secondary rounded-lg border border-border text-foreground font-medium mt-1">
                          {profile?.company_representative?.job_title || '-'}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-foreground-muted italic pt-1">
                    {t('profile.companyNote')}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Super Admin Info */}
            {primaryRole === 'super_admin' && (
              <Card className="bg-surface border-border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
                    <Shield className="h-5 w-5 text-university-primary" />
                    {t('profile.status')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-foreground">
                    System Administrator account with full management privileges.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Student Portfolio (Skills, Interests, Languages, Achievements) */}
            {isStudent && (
              <StudentPortfolioSection
                isEditing={isEditing}
                skills={profile?.student_profile?.skills || []}
                availableSkills={availableSkills}
                interests={portfolioData.interests}
                languages={portfolioData.languages}
                achievements={portfolioData.achievements}
                onAddInterest={handleAddInterest}
                onRemoveInterest={handleRemoveInterest}
                onAddLanguage={handleAddLanguage}
                onRemoveLanguage={handleRemoveLanguage}
                onAddAchievement={handleAddAchievement}
                onRemoveAchievement={handleRemoveAchievement}
                onAttachSkill={handleAttachSkill}
                onDetachSkill={handleDetachSkill}
                isSkillLoading={skillStatus === 'loading'}
              />
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
