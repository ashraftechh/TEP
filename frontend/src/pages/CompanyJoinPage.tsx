import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useLocation, useNavigate, Link } from 'react-router';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { localizeAuthError } from '@/lib/localizeError';
import { createStrongPasswordSchema, isValidYemenPhone } from '@/lib/validations/auth';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';
import { useAppDispatch, useAppSelector } from '@/store';
import { setAuthenticatedUser } from '@/store/slices/authSlice';
import {
  inspectCompanyJoinInvite,
  companyJoinRegister,
  resetCompanyJoinState,
  clearCompanyJoinSubmitError,
  type CompanyJoinDetails,
} from '@/store/slices/companyJoinSlice';
import { cn } from '@/lib/utils';
import {
  Mail,
  User,
  Phone,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ArrowRight,
  UserPlus,
} from 'lucide-react';

interface EyeToggleProps {
  show: boolean;
  onToggle: () => void;
  isRtl: boolean;
}

function EyeToggle({ show, onToggle, isRtl }: EyeToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'absolute top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground cursor-pointer p-1 rounded transition-colors',
        isRtl ? 'left-3' : 'right-3'
      )}
      tabIndex={-1}
      aria-label={show ? 'Hide password' : 'Show password'}
    >
      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  );
}

export function CompanyJoinPage() {
  const { t, i18n } = useTranslation(['companies', 'common', 'auth']);
  const lang = i18n.language || 'ar';
  const navigate = useNavigate();
  const { company: companyId } = useParams<{ company: string }>();
  const location = useLocation();

  const dispatch = useAppDispatch();
  const {
    inspectStatus,
    joinDetails,
    inspectError,
    inspectErrorCode,
    submitStatus,
    submitError,
    submitErrorCode,
    submitValidationErrors,
  } = useAppSelector((state) => state.companyJoin);

  // The full query string must be preserved (signature, expires, email) for signed URL validation
  const queryString = location.search;

  useEffect(() => {
    document.title = `${t('companies:companyJoin.pageTitle')} | ${t('common:pageTitleSuffix', 'منصة التدريب التعاوني')}`;
  }, [t, lang]);

  // Inspect invite on mount
  useEffect(() => {
    if (companyId && queryString) {
      dispatch(inspectCompanyJoinInvite({ companyId, queryString }));
    }
    return () => {
      dispatch(resetCompanyJoinState());
    };
  }, [dispatch, companyId, queryString]);

  // Redirect to /verify-email after successful registration (same as student flow)
  useEffect(() => {
    if (submitStatus === 'succeeded') {
      navigate('/verify-email', { replace: true });
    }
  }, [submitStatus, navigate]);

  const isLoading = inspectStatus === 'loading';
  const isInvalid = inspectStatus === 'failed';
  const isReady = inspectStatus === 'succeeded' && joinDetails !== null;
  const isSubmitting = submitStatus === 'loading';

  return (
    <div className="min-h-screen bg-surface-secondary text-foreground flex flex-col justify-center py-8 sm:py-12 sm:px-6 lg:px-8 transition-colors duration-200">
      {/* Top bar: Language Switcher & Theme Toggle */}
      <div className="absolute top-4 end-4 z-10 flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-lg px-4 my-auto">
        {isLoading && <LoadingView />}
        {isInvalid && <InvalidInviteView error={inspectError} errorCode={inspectErrorCode} />}
        {isReady && (
          <RegisterAccountView
            joinDetails={joinDetails}
            companyId={companyId!}
            queryString={queryString}
            isSubmitting={isSubmitting}
            submitError={submitError}
            submitErrorCode={submitErrorCode}
            submitValidationErrors={submitValidationErrors}
          />
        )}
      </div>
    </div>
  );
}

/** Spinner shown while the invite is being verified */
function LoadingView() {
  const { t } = useTranslation('companies');
  return (
    <div className="w-full rounded-2xl border border-border bg-surface shadow-sm overflow-hidden p-12 text-center">
      <Loader2 className="h-10 w-10 animate-spin text-university-primary mx-auto mb-4" />
      <p className="text-foreground-muted text-sm">{t('companyJoin.loadingInvite')}</p>
    </div>
  );
}

/** Shown when the invite is invalid, expired, or already used */
function InvalidInviteView({
  error,
  errorCode,
}: {
  error: string | null;
  errorCode: string | null;
}) {
  const { t, i18n } = useTranslation('companies');
  const isRtl = i18n.language === 'ar';
  const localizedError = localizeAuthError(error, t, errorCode);

  return (
    <div className="w-full rounded-2xl border border-border bg-surface shadow-sm overflow-hidden">
      <div className="bg-destructive/10 border-b border-destructive/20 px-6 py-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center">
            <AlertCircle className="h-9 w-9 text-destructive" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-foreground">{t('companyJoin.invalidInvite')}</h1>
      </div>
      <div className="px-6 py-7 space-y-6">
        <p className="text-foreground-muted text-sm leading-relaxed text-center">
          {localizedError && localizedError !== error
            ? localizedError
            : t('companyJoin.invalidInviteMessage')}
        </p>
        <Link
          to="/login"
          className="flex items-center justify-center gap-2 w-full h-11 rounded-md bg-university-primary text-white font-semibold hover:bg-university-secondary transition-colors cursor-pointer shadow-sm"
        >
          {isRtl ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
          <span>{t('companyJoin.backToLogin')}</span>
        </Link>
      </div>
    </div>
  );
}

/** Unified registration form — always shown on a valid invite link */
function RegisterAccountView({
  joinDetails,
  companyId,
  queryString,
  isSubmitting,
  submitError,
  submitErrorCode,
  submitValidationErrors,
}: {
  joinDetails: CompanyJoinDetails;
  companyId: string;
  queryString: string;
  isSubmitting: boolean;
  submitError: string | null;
  submitErrorCode: string | null;
  submitValidationErrors: Record<string, string[]> | null;
}) {
  const { t, i18n } = useTranslation(['auth', 'companies']);
  const lang = i18n.language || 'ar';
  const isRtl = lang === 'ar';
  const dispatch = useAppDispatch();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const schema = useMemo(
    () =>
      z
        .object({
          email: z
            .string()
            .min(1, t('companies:errors.joinEmailRequired'))
            .email(t('companies:errors.joinEmailInvalid')),
          name: z
            .string()
            .min(1, t('companies:errors.joinNameRequired'))
            .min(3, t('auth:register.errors.nameMin'))
            .max(255, t('auth:register.errors.nameMax')),
          phone: z
            .string()
            .optional()
            .refine((val) => isValidYemenPhone(val), {
              message: t('companies:errors.phoneInvalid'),
            }),
          password: createStrongPasswordSchema(t, 'register'),
          password_confirmation: z.string().min(1, t('companies:errors.joinPasswordRequired')),
        })
        .superRefine((data, ctx) => {
          if (data.password !== data.password_confirmation) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: t('companies:errors.joinPasswordMismatch'),
              path: ['password_confirmation'],
            });
          }
        }),
    [t]
  );

  type RegisterFormValues = z.infer<typeof schema>;

  const getLocalizedServerError = useCallback(
    (field: keyof RegisterFormValues, rawError: string): string => {
      const normalizedError = rawError.toLowerCase();
      const isAlreadyUsedError =
        normalizedError.includes('already') ||
        normalizedError.includes('taken') ||
        normalizedError.includes('exists') ||
        normalizedError.includes('مستخدم') ||
        normalizedError.includes('موجود') ||
        normalizedError.includes('مسجل');

      if (isAlreadyUsedError && field === 'email') {
        return t('companies:errors.joinEmailAlreadyExists');
      }

      if (isAlreadyUsedError && field === 'phone') {
        return t('companies:errors.joinPhoneAlreadyExists');
      }

      const localizedError = localizeAuthError(rawError, t);
      if (localizedError && localizedError !== rawError) return localizedError;

      const validationErrorMap: Record<string, string> = {
        'The email field is required.': t('companies:errors.joinEmailRequired'),
        'The email must be a valid email address.': t('companies:errors.joinEmailInvalid'),
        'The name field is required.': t('companies:errors.joinNameRequired'),
        'The password field is required.': t('companies:errors.joinPasswordRequired'),
        'The password must be at least 8 characters.': t('companies:errors.joinPasswordMin'),
        'The password confirmation field is required.': t('companies:errors.joinPasswordRequired'),
        'The password confirmation and password must match.': t(
          'companies:errors.joinPasswordMismatch'
        ),
      };

      return (
        validationErrorMap[rawError] ||
        t(`companies:errors.${field}Invalid`, {
          defaultValue: t('companies:errors.serverError'),
        })
      );
    },
    [t]
  );

  const {
    register,
    handleSubmit,
    control,
    setError,
    clearErrors,
    trigger,
    formState: { errors, isSubmitted },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      email: joinDetails.email || '',
      name: '',
      phone: '',
      password: '',
      password_confirmation: '',
    },
  });

  const watchedPassword = useWatch({ control, name: 'password' }) || '';

  // Apply server validation errors to form fields
  React.useEffect(() => {
    if (submitValidationErrors) {
      Object.entries(submitValidationErrors).forEach(([field, messages]) => {
        if (messages && messages.length > 0) {
          const validFields = [
            'email',
            'name',
            'phone',
            'password',
            'password_confirmation',
          ] as const;
          if (validFields.includes(field as (typeof validFields)[number])) {
            const localizedMsg = getLocalizedServerError(
              field as keyof RegisterFormValues,
              messages[0]
            );
            setError(field as keyof RegisterFormValues, {
              type: 'server',
              message: localizedMsg,
            });
          }
        }
      });
    }
  }, [submitValidationErrors, setError, getLocalizedServerError]);

  const getFieldError = (field: keyof RegisterFormValues): string | undefined => {
    if (errors[field]?.message) return errors[field].message;

    const serverError = submitValidationErrors?.[field];
    if (serverError && serverError.length > 0) {
      return getLocalizedServerError(field, serverError[0]);
    }

    return undefined;
  };

  // Re-validate on language change so all messages translate
  React.useEffect(() => {
    if (isSubmitted) {
      trigger();
    }
  }, [i18n.language, trigger, isSubmitted]);

  const onSubmit = useCallback(
    async (data: RegisterFormValues) => {
      dispatch(clearCompanyJoinSubmitError());
      const resultAction = await dispatch(
        companyJoinRegister({
          companyId,
          queryString,
          formData: {
            name: data.name,
            email: data.email,
            phone: data.phone,
            password: data.password,
            password_confirmation: data.password_confirmation,
          },
        })
      );

      if (
        resultAction?.type === 'companyJoin/register/fulfilled' &&
        'payload' in resultAction &&
        resultAction.payload &&
        typeof resultAction.payload === 'object' &&
        'data' in resultAction.payload
      ) {
        dispatch(setAuthenticatedUser(resultAction.payload.data));
      }
    },
    [dispatch, companyId, queryString]
  );

  const emailError = getFieldError('email');
  const nameError = getFieldError('name');
  const phoneError = getFieldError('phone');
  const passwordError = getFieldError('password');
  const passwordConfirmationError = getFieldError('password_confirmation');
  const localizedSubmitError = localizeAuthError(submitError, t, submitErrorCode);
  const submitErrorMessage =
    localizedSubmitError && localizedSubmitError !== submitError
      ? localizedSubmitError
      : submitError
        ? t('companies:errors.serverError')
        : null;

  return (
    <Card className="w-full rounded-2xl border border-border bg-surface shadow-sm overflow-hidden">
      <CardHeader className="flex flex-col p-6 space-y-4 pb-6 text-center">
        {/* Logo */}
        <div className="flex justify-center">
          <Logo size="md" />
        </div>

        {/* Icon Badge & Heading */}
        <div>
          <div className="w-12 h-12 rounded-full bg-university-primary/10 flex items-center justify-center mx-auto mb-3">
            <UserPlus className="h-6 w-6 text-university-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            {t('companies:companyJoin.registerTitle')}
          </CardTitle>
          <CardDescription className="text-foreground-muted mt-1">
            {t('companies:companyJoin.registerSubtitle', { companyName: joinDetails.company_name })}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="px-6 py-6 space-y-5">
        {/* Company Contact Email reference badge if different from representative email */}
        {joinDetails.contact_email && (
          <div className="p-3 rounded-lg bg-surface-secondary/70 border border-border/80 text-xs text-foreground-muted flex items-center justify-between">
            <span className="font-medium">{t('companies:companyJoin.contactEmail')}</span>
            <span dir="ltr" className="font-mono text-foreground font-semibold">
              {joinDetails.contact_email}
            </span>
          </div>
        )}

        {/* General submission error */}
        {submitErrorMessage && !submitValidationErrors && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{submitErrorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Representative Login Email (editable) */}
          <div className="space-y-1.5">
            <Label htmlFor="join-email" className="text-sm font-medium text-foreground">
              {t('companies:companyJoin.representativeEmail')}{' '}
              <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Mail
                className={cn(
                  'absolute top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted pointer-events-none',
                  isRtl ? 'right-3' : 'left-3'
                )}
              />
              <Input
                id="join-email"
                type="email"
                dir="ltr"
                placeholder={t('companies:companyJoin.representativeEmailPlaceholder')}
                {...register('email', {
                  onChange: () => {
                    if (getFieldError('email')) clearErrors('email');
                  },
                })}
                className={cn(
                  'h-11 border-border',
                  isRtl ? 'pr-10 text-right' : 'pl-10',
                  emailError && 'border-destructive'
                )}
                disabled={isSubmitting}
              />
            </div>
            {emailError && (
              <p className="text-xs text-destructive font-medium mt-1">{emailError}</p>
            )}
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="join-name" className="text-sm font-medium text-foreground">
              {t('companies:companyJoin.name')} <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <User
                className={cn(
                  'absolute top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted pointer-events-none',
                  isRtl ? 'right-3' : 'left-3'
                )}
              />
              <Input
                id="join-name"
                type="text"
                placeholder={t('companies:companyJoin.namePlaceholder')}
                {...register('name', {
                  onChange: () => {
                    if (getFieldError('name')) clearErrors('name');
                  },
                })}
                className={cn(
                  'h-11 border-border',
                  isRtl ? 'pr-10' : 'pl-10',
                  nameError && 'border-destructive'
                )}
                disabled={isSubmitting}
              />
            </div>
            {nameError && <p className="text-xs text-destructive font-medium mt-1">{nameError}</p>}
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="join-phone" className="text-sm font-medium text-foreground">
              {t('companies:companyJoin.phone')}
            </Label>
            <div className="relative">
              <Phone
                className={cn(
                  'absolute top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted pointer-events-none',
                  isRtl ? 'right-3' : 'left-3'
                )}
              />
              <Input
                id="join-phone"
                type="tel"
                dir="ltr"
                placeholder={t('companies:companyJoin.phonePlaceholder')}
                {...register('phone')}
                className={cn(
                  'h-11 border-border',
                  isRtl ? 'pr-10 text-right' : 'pl-10',
                  phoneError && 'border-destructive'
                )}
                disabled={isSubmitting}
              />
            </div>
            {phoneError && (
              <p className="text-xs text-destructive font-medium mt-1">{phoneError}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="join-password" className="text-sm font-medium text-foreground">
              {t('companies:companyJoin.password')} <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Lock
                className={cn(
                  'absolute top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted pointer-events-none',
                  isRtl ? 'right-3' : 'left-3'
                )}
              />
              <Input
                id="join-password"
                type={showPassword ? 'text' : 'password'}
                dir="ltr"
                placeholder={t('companies:companyJoin.passwordPlaceholder')}
                {...register('password', {
                  onChange: () => {
                    if (getFieldError('password')) clearErrors('password');
                  },
                })}
                className={cn(
                  'h-11 border-border',
                  isRtl ? 'pr-10 pl-10 text-right' : 'pl-10 pr-10',
                  passwordError && 'border-destructive'
                )}
                disabled={isSubmitting}
              />
              <EyeToggle
                show={showPassword}
                onToggle={() => setShowPassword(!showPassword)}
                isRtl={isRtl}
              />
            </div>
            {passwordError && (
              <p className="text-xs text-destructive font-medium mt-1">{passwordError}</p>
            )}

            {/* Password Strength Meter & Interactive Checklist */}
            <div className="mt-2.5">
              <PasswordStrengthMeter password={watchedPassword} />
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <Label htmlFor="join-confirm-password" className="text-sm font-medium text-foreground">
              {t('companies:companyJoin.confirmPassword')}{' '}
              <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Lock
                className={cn(
                  'absolute top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted pointer-events-none',
                  isRtl ? 'right-3' : 'left-3'
                )}
              />
              <Input
                id="join-confirm-password"
                type={showConfirm ? 'text' : 'password'}
                dir="ltr"
                placeholder={t('companies:companyJoin.confirmPasswordPlaceholder')}
                {...register('password_confirmation', {
                  onChange: () => {
                    if (getFieldError('password_confirmation'))
                      clearErrors('password_confirmation');
                  },
                })}
                className={cn(
                  'h-11 border-border',
                  isRtl ? 'pr-10 pl-10 text-right' : 'pl-10 pr-10',
                  passwordConfirmationError && 'border-destructive'
                )}
                disabled={isSubmitting}
              />
              <EyeToggle
                show={showConfirm}
                onToggle={() => setShowConfirm(!showConfirm)}
                isRtl={isRtl}
              />
            </div>
            {passwordConfirmationError && (
              <p className="text-xs text-destructive font-medium mt-1">
                {passwordConfirmationError}
              </p>
            )}
          </div>

          {/* Submit button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-11 bg-university-primary hover:bg-university-secondary text-white font-semibold cursor-pointer transition-colors shadow-sm mt-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin me-2" />
                {t('companies:companyJoin.registering')}
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 me-2" />
                {t('companies:companyJoin.registerButton')}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default CompanyJoinPage;
