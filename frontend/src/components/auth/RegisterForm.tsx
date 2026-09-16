import React, { useState } from 'react';
import { Link } from 'react-router';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Logo } from '@/components/Logo';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';
import { localizeAuthError } from '@/lib/localizeError';
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Layers,
  AlertCircle,
  RotateCw,
  UserPlus,
} from 'lucide-react';

import { createRegisterSchema, type RegisterFormValues } from '@/lib/validations/auth';
import { useAppDispatch, useAppSelector } from '@/store';
import { registerUser } from '@/store/slices/authSlice';
import { cn } from '@/lib/utils';

export interface OptionItem {
  id: string | number;
  name: string | { ar?: string; en?: string; [key: string]: string | undefined };
}

export interface RegisterFormProps {
  onRegister?: (data: RegisterFormValues) => Promise<void> | void;
  onSwitchToLogin?: () => void;
  majors?: OptionItem[];
  isLoadingLookups?: boolean;
}

export function RegisterForm({
  onRegister,
  onSwitchToLogin,
  majors = [],
  isLoadingLookups = false,
}: RegisterFormProps) {
  const { t, i18n } = useTranslation(['auth', 'companies']);
  const isRtl = i18n.language === 'ar';

  const dispatch = useAppDispatch();
  const authState = useAppSelector((state) => state.auth);

  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [serverValidationErrors, setServerValidationErrors] = useState<Record<
    string,
    string[]
  > | null>(null);

  const schema = React.useMemo(() => createRegisterSchema(t), [t]);

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
      account_type: 'student',
      name: '',
      email: '',
      phone: '',
      password: '',
      password_confirmation: '',
      major_id: '',
    },
  });

  // Re-apply and localize server-side errors on language change
  React.useEffect(() => {
    if (serverValidationErrors) {
      Object.entries(serverValidationErrors).forEach(([field, messages]) => {
        if (messages && messages.length > 0) {
          const localizedMsg = localizeAuthError(messages[0], t) || messages[0];
          setError(field as keyof RegisterFormValues, {
            type: 'server',
            message: localizedMsg,
          });
        }
      });
    }
  }, [serverValidationErrors, setError, t]);

  // Re-trigger validation on language change if the form has already been submitted
  // so that active validation error messages immediately reflect the new language.
  React.useEffect(() => {
    if (isSubmitted) {
      trigger();
    }
  }, [i18n.language, isSubmitted, trigger]);

  const watchedPassword = useWatch({
    control,
    name: 'password',
    defaultValue: '',
  });

  const getOptionLabel = (optionName?: OptionItem['name']): string => {
    if (!optionName) return '';
    if (typeof optionName === 'string') return optionName;
    return (isRtl ? optionName.ar : optionName.en) || optionName.en || optionName.ar || '';
  };

  const getFieldError = (field: keyof RegisterFormValues): string | undefined => {
    if (errors[field]?.message) return errors[field]?.message;
    const serverErr = serverValidationErrors?.[field];
    if (serverErr && serverErr.length > 0) {
      return localizeAuthError(serverErr[0], t) || serverErr[0];
    }
    return undefined;
  };

  const onSubmit = async (values: RegisterFormValues) => {
    setIsSubmitting(true);
    setGeneralError(null);
    setServerValidationErrors(null);
    try {
      if (onRegister) {
        await onRegister(values);
      } else {
        const resultAction = await dispatch(registerUser(values));
        if (registerUser.rejected.match(resultAction)) {
          const payload = resultAction.payload;
          if (payload?.errors && Object.keys(payload.errors).length > 0) {
            setServerValidationErrors(payload.errors);
            Object.entries(payload.errors).forEach(([field, messages]) => {
              if (messages && messages.length > 0) {
                const localizedMsg = localizeAuthError(messages[0], t) || messages[0];
                setError(field as keyof RegisterFormValues, {
                  type: 'server',
                  message: localizedMsg,
                });
              }
            });
          } else {
            const rawMsg =
              payload?.message ||
              resultAction.error?.message ||
              'Registration failed. Please try again.';
            setGeneralError(rawMsg);
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setGeneralError(err.message);
      } else {
        setGeneralError('Registration failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * SSO OAuth Popup Handler
   * Opens authentication in a centered popup window instead of full page navigation.
   */
  const handleSsoRedirect = (provider: 'google' | 'microsoft') => {
    const width = 500;
    const height = 650;
    const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
    const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);
    const url = `/api/v1/auth/${provider}/redirect`;

    const popup = window.open(
      url,
      `sso_${provider}`,
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
    );

    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      // Fallback to direct redirect if popup blocked
      window.location.href = url;
      return;
    }

    const messageListener = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'sso-complete') {
        window.removeEventListener('message', messageListener);
        clearInterval(timer);
        window.location.href = '/dashboard';
      }
    };

    window.addEventListener('message', messageListener);

    const timer = setInterval(() => {
      if (popup.closed) {
        clearInterval(timer);
        window.removeEventListener('message', messageListener);
      }
    }, 500);
  };

  const isFormLoading = isSubmitting || authState.status === 'loading';

  return (
    <Card className="w-full shadow-sm border border-border bg-surface">
      <CardHeader className="space-y-4 pb-6 text-center">
        {/* Centered Logo */}
        <div className="flex justify-center">
          <Logo size="md" />
        </div>

        <div>
          <CardTitle className="text-2xl font-bold text-foreground">
            {t('register.title')}
          </CardTitle>
          <CardDescription className="text-foreground-muted mt-1">
            {t('register.subtitle')}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Error Alert Banner */}
        {generalError && (
          <div
            role="alert"
            className="flex items-start gap-3 p-3.5 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm"
          >
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">{t('register.failed', 'Registration Failed')}</p>
              <p className="text-xs mt-0.5 opacity-90">
                {localizeAuthError(generalError, t) || generalError}
              </p>
            </div>
          </div>
        )}

        {/* Registration Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4.5"
          noValidate
          data-testid="register-form"
        >
          {/* Full Name */}
          <div>
            <Label htmlFor="name" className="text-foreground font-semibold" required>
              {t('register.name')}
            </Label>
            <div className="relative mt-1">
              <User
                className={`absolute top-2.5 h-4 w-4 text-foreground-muted pointer-events-none ${
                  isRtl ? 'right-3' : 'left-3'
                }`}
              />
              <Input
                id="name"
                type="text"
                placeholder={t('register.namePlaceholder')}
                className={isRtl ? 'pr-9 pl-3' : 'pl-9 pr-3'}
                aria-invalid={!!getFieldError('name')}
                {...register('name', {
                  onChange: () => {
                    if (getFieldError('name')) clearErrors('name');
                  },
                })}
              />
            </div>
            {getFieldError('name') && (
              <p className="text-xs text-destructive font-medium mt-1">{getFieldError('name')}</p>
            )}
          </div>

          {/* Email Address */}
          <div>
            <Label htmlFor="email" className="text-foreground font-semibold" required>
              {t('register.email')}
            </Label>
            <div className="relative mt-1">
              <Mail
                className={`absolute top-2.5 h-4 w-4 text-foreground-muted pointer-events-none ${
                  isRtl ? 'right-3' : 'left-3'
                }`}
              />
              <Input
                id="email"
                type="email"
                placeholder={t('register.emailPlaceholder')}
                className={isRtl ? 'pr-9 pl-3' : 'pl-9 pr-3'}
                aria-invalid={!!getFieldError('email')}
                {...register('email', {
                  onChange: () => {
                    if (getFieldError('email')) clearErrors('email');
                  },
                })}
              />
            </div>
            {getFieldError('email') && (
              <p className="text-xs text-destructive font-medium mt-1">{getFieldError('email')}</p>
            )}
          </div>

          {/* Phone Number (Optional) */}
          <div>
            <Label htmlFor="phone" className="text-foreground font-semibold">
              {t('register.phone')}
            </Label>
            <div className="relative mt-1">
              <Phone
                className={`absolute top-2.5 h-4 w-4 text-foreground-muted pointer-events-none ${
                  isRtl ? 'right-3' : 'left-3'
                }`}
              />
              <Input
                id="phone"
                type="tel"
                dir="ltr"
                placeholder={t('register.phonePlaceholder')}
                className={`${isRtl ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'} [direction:ltr]`}
                aria-invalid={!!getFieldError('phone')}
                {...register('phone', {
                  onChange: () => {
                    if (getFieldError('phone')) clearErrors('phone');
                  },
                })}
              />
            </div>
            {getFieldError('phone') && (
              <p className="text-xs text-destructive font-medium mt-1">{getFieldError('phone')}</p>
            )}
          </div>

          {/* Academic Major Selection */}
          <div>
            <Label htmlFor="major_id" className="text-foreground font-semibold" required>
              {t('register.major')}
            </Label>
            <div className="relative mt-1">
              <Controller
                control={control}
                name="major_id"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(val) => {
                      field.onChange(val);
                      if (getFieldError('major_id')) clearErrors('major_id');
                    }}
                  >
                    <SelectTrigger
                      id="major_id"
                      aria-invalid={!!getFieldError('major_id')}
                      className={isRtl ? 'pr-9 pl-3' : 'pl-9 pr-3'}
                    >
                      <SelectValue placeholder={t('register.selectMajor')}>
                        {field.value
                          ? getOptionLabel(
                              majors.find((m) => String(m.id) === String(field.value))?.name
                            )
                          : undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {majors.length > 0 ? (
                        majors.map((major) => (
                          <SelectItem key={major.id} value={String(major.id)}>
                            {getOptionLabel(major.name)}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="" disabled>
                          {isLoadingLookups ? '...' : t('register.selectMajor')}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
              <Layers
                className={`absolute top-2.5 h-4 w-4 text-foreground-muted pointer-events-none ${
                  isRtl ? 'right-3' : 'left-3'
                }`}
              />
            </div>
            {getFieldError('major_id') && (
              <p className="text-xs text-destructive font-medium mt-1">
                {getFieldError('major_id')}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <Label htmlFor="password" className="text-foreground font-semibold" required>
              {t('register.password')}
            </Label>
            <div className="relative mt-1">
              <Lock
                className={`absolute top-2.5 h-4 w-4 text-foreground-muted pointer-events-none ${
                  isRtl ? 'right-3' : 'left-3'
                }`}
              />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder={t('register.passwordPlaceholder')}
                className={isRtl ? 'pr-9 pl-9' : 'pl-9 pr-9'}
                aria-invalid={!!getFieldError('password')}
                {...register('password', {
                  onChange: () => {
                    if (getFieldError('password')) clearErrors('password');
                  },
                })}
              />
              <button
                type="button"
                className={`absolute top-2.5 text-foreground-muted hover:text-foreground cursor-pointer focus:outline-none ${
                  isRtl ? 'left-3' : 'right-3'
                }`}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {getFieldError('password') && (
              <p className="text-xs text-destructive font-medium mt-1">
                {getFieldError('password')}
              </p>
            )}

            {/* Password Strength Meter & Interactive Checklist */}
            <div className="mt-2.5">
              <PasswordStrengthMeter password={watchedPassword} />
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <Label
              htmlFor="password_confirmation"
              className="text-foreground font-semibold"
              required
            >
              {t('register.passwordConfirmation')}
            </Label>
            <div className="relative mt-1">
              <Lock
                className={`absolute top-2.5 h-4 w-4 text-foreground-muted pointer-events-none ${
                  isRtl ? 'right-3' : 'left-3'
                }`}
              />
              <Input
                id="password_confirmation"
                type={showPasswordConfirmation ? 'text' : 'password'}
                placeholder={t('register.passwordConfirmationPlaceholder')}
                className={isRtl ? 'pr-9 pl-9' : 'pl-9 pr-9'}
                aria-invalid={!!getFieldError('password_confirmation')}
                {...register('password_confirmation', {
                  onChange: () => {
                    if (getFieldError('password_confirmation'))
                      clearErrors('password_confirmation');
                  },
                })}
              />
              <button
                type="button"
                className={`absolute top-2.5 text-foreground-muted hover:text-foreground cursor-pointer focus:outline-none ${
                  isRtl ? 'left-3' : 'right-3'
                }`}
                onClick={() => setShowPasswordConfirmation(!showPasswordConfirmation)}
                aria-label={showPasswordConfirmation ? 'Hide password' : 'Show password'}
              >
                {showPasswordConfirmation ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {getFieldError('password_confirmation') && (
              <p className="text-xs text-destructive font-medium mt-1">
                {getFieldError('password_confirmation')}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isFormLoading}
            className="w-full h-11 cursor-pointer bg-university-primary hover:bg-university-secondary text-white font-medium mt-3 shadow-sm transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isFormLoading ? (
              <RotateCw className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className={cn('h-4 w-4', isRtl && 'scale-x-[-1]')} />
            )}
            {isFormLoading ? t('register.submitting') : t('register.submit')}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center py-1">
          <div className="flex-grow border-t border-border" />
          <span className="flex-shrink mx-4 text-xs uppercase font-medium text-foreground-muted">
            {t('register.orDivider')}
          </span>
          <div className="flex-grow border-t border-border" />
        </div>

        {/* 2. SSO OAuth Social Login Buttons */}
        <div className="space-y-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSsoRedirect('google')}
            className="w-full h-11 flex items-center justify-center gap-3 cursor-pointer border-border-input bg-surface hover:bg-surface-hover text-foreground font-medium transition-colors"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            {t('register.continueWithGoogle')}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => handleSsoRedirect('microsoft')}
            className="w-full h-11 flex items-center justify-center gap-3 cursor-pointer border-border-input bg-surface hover:bg-surface-hover text-foreground font-medium transition-colors"
          >
            <svg className="h-5 w-5" viewBox="0 0 23 23">
              <path fill="#f35325" d="M1 1h10v10H1z" />
              <path fill="#81bc06" d="M12 1h10v10H12z" />
              <path fill="#05a6f0" d="M1 12h10v10H1z" />
              <path fill="#ffba08" d="M12 12h10v10H12z" />
            </svg>
            {t('register.continueWithMicrosoft')}
          </Button>
        </div>

        {/* 3. Switch to Login */}
        <div className="pt-2 text-center">
          <p className="text-sm text-foreground-muted">
            {t('register.alreadyHaveAccount')}{' '}
            <button
              type="button"
              className="text-university-primary font-medium hover:underline focus:outline-none cursor-pointer"
              onClick={onSwitchToLogin}
            >
              {t('register.loginLink')}
            </button>
          </p>
        </div>

        {/* 4. Register Company link */}
        <div className="pt-1 text-center">
          <p className="text-sm text-foreground-muted">
            {t('companies:companyRequest.requestCompanyLink')}{' '}
            <Link
              to="/register-company"
              className="text-university-primary font-medium hover:underline cursor-pointer"
            >
              {t('companies:companyRequest.requestCompanyLinkAction')}
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
