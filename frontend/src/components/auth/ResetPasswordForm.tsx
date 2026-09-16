import React, { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/Logo';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';
import { localizeAuthError } from '@/lib/localizeError';
import {
  Lock,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  RotateCw,
  CheckCircle2,
} from 'lucide-react';

import { createResetPasswordSchema, type ResetPasswordFormValues } from '@/lib/validations/auth';

export type { ResetPasswordFormValues };

export interface ResetPasswordFormProps {
  token: string;
  defaultEmail?: string;
  onSubmit?: (data: ResetPasswordFormValues) => Promise<void> | void;
  onBackToLogin?: () => void;
  isLoading?: boolean;
  errorMessage?: string | null;
  serverValidationErrors?: Record<string, string[]> | null;
}

export function ResetPasswordForm({
  token,
  defaultEmail = '',
  onSubmit,
  onBackToLogin,
  isLoading = false,
  errorMessage = null,
  serverValidationErrors = null,
}: ResetPasswordFormProps) {
  const { t, i18n } = useTranslation('auth');
  const isRtl = i18n.language === 'ar';

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const schema = React.useMemo(() => createResetPasswordSchema(t), [t]);

  const {
    register,
    handleSubmit,
    control,
    setError,
    trigger,
    formState: { errors, isSubmitted },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      token: token || '',
      email: defaultEmail || '',
      password: '',
      password_confirmation: '',
    },
  });

  const watchedPassword = useWatch({
    control,
    name: 'password',
    defaultValue: '',
  });

  // Apply server-side 422 validation errors to corresponding form fields
  React.useEffect(() => {
    if (serverValidationErrors) {
      Object.entries(serverValidationErrors).forEach(([field, messages]) => {
        if (
          messages &&
          messages.length > 0 &&
          (field === 'email' ||
            field === 'password' ||
            field === 'password_confirmation' ||
            field === 'token')
        ) {
          const localizedMsg = localizeAuthError(messages[0], t) || messages[0];
          setError(field as keyof ResetPasswordFormValues, {
            type: 'server',
            message: localizedMsg,
          });
        }
      });
    }
  }, [serverValidationErrors, setError, t]);

  // Re-trigger validation on language change if the form has already been submitted
  React.useEffect(() => {
    if (isSubmitted) {
      trigger();
    }
  }, [i18n.language, isSubmitted, trigger]);

  const getFieldError = (field: keyof ResetPasswordFormValues): string | undefined => {
    if (errors[field]?.message) return errors[field]?.message;
    const serverErr = serverValidationErrors?.[field];
    if (serverErr && serverErr.length > 0) {
      return localizeAuthError(serverErr[0], t) || serverErr[0];
    }
    return undefined;
  };

  const handleFormSubmit = async (data: ResetPasswordFormValues) => {
    if (onSubmit) {
      await onSubmit(data);
    }
  };

  const emailError = getFieldError('email');
  const passwordError = getFieldError('password');
  const passwordConfirmationError = getFieldError('password_confirmation');

  return (
    <Card
      className="w-full max-w-lg mx-auto shadow-lg bg-surface border-border animate-in fade-in duration-200"
      dir={isRtl ? 'rtl' : 'ltr'}
      data-testid="reset-password-form"
    >
      <CardHeader className="space-y-3 text-center pb-4">
        {/* Brand Lockup */}
        <div className="flex justify-center">
          <Logo size="md" showSubtitle={true} />
        </div>

        {/* Lock Icon Badge */}
        <div className="flex justify-center pt-1">
          <div className="w-14 h-14 rounded-full bg-university-light dark:bg-university-primary/20 flex items-center justify-center text-university-primary dark:text-university-accent shadow-inner">
            <KeyRound className="h-7 w-7" />
          </div>
        </div>

        <div className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
            {t('resetPassword.title')}
          </CardTitle>
          <CardDescription className="text-sm text-foreground-muted max-w-sm mx-auto">
            {t('resetPassword.subtitle')}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Error Banner */}
        {errorMessage && (
          <div
            role="alert"
            className="flex items-center gap-2 p-3 text-sm rounded-md bg-destructive-light dark:bg-destructive/20 text-destructive border border-destructive/30 animate-in fade-in duration-150"
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{localizeAuthError(errorMessage, t)}</span>
          </div>
        )}

        {/* Reset Password Form */}
        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="space-y-4.5"
          noValidate
          data-testid="reset-password-form-element"
        >
          {/* Hidden Token Input */}
          <input type="hidden" {...register('token')} value={token} />

          {/* Email Address */}
          <div>
            <Label htmlFor="email" className="text-foreground" required>
              {t('resetPassword.email')}
            </Label>
            <div className="relative mt-1.5">
              <div
                className={`absolute inset-y-0 ${
                  isRtl ? 'right-0 pr-3' : 'left-0 pl-3'
                } flex items-center pointer-events-none text-foreground-muted`}
              >
                <Mail className="h-4 w-4" />
              </div>
              <Input
                id="email"
                type="email"
                dir="ltr"
                placeholder={t('resetPassword.emailPlaceholder')}
                disabled={isLoading}
                className={`${
                  isRtl ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'
                } h-11 border-border-input bg-surface focus:bg-surface text-foreground transition-colors ${
                  emailError ? 'border-destructive focus-visible:ring-destructive' : ''
                }`}
                {...register('email')}
              />
            </div>
            {emailError && (
              <p className="text-xs text-destructive font-medium mt-1">{emailError}</p>
            )}
          </div>

          {/* New Password */}
          <div>
            <Label htmlFor="password" className="text-foreground" required>
              {t('resetPassword.password')}
            </Label>
            <div className="relative mt-1.5">
              <div
                className={`absolute inset-y-0 ${
                  isRtl ? 'right-0 pr-3' : 'left-0 pl-3'
                } flex items-center pointer-events-none text-foreground-muted`}
              >
                <Lock className="h-4 w-4" />
              </div>
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                dir="ltr"
                placeholder={t('resetPassword.passwordPlaceholder')}
                disabled={isLoading}
                className={`${
                  isRtl ? 'pr-9 pl-10 text-right' : 'pl-9 pr-10 text-left'
                } h-11 border-border-input bg-surface focus:bg-surface text-foreground transition-colors ${
                  passwordError ? 'border-destructive focus-visible:ring-destructive' : ''
                }`}
                {...register('password')}
              />
              <button
                type="button"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className={`absolute top-0 h-full px-3 flex items-center cursor-pointer text-foreground-muted hover:text-foreground transition-colors ${
                  isRtl ? 'left-0' : 'right-0'
                }`}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {passwordError && (
              <p className="text-xs text-destructive font-medium mt-1">{passwordError}</p>
            )}
            <PasswordStrengthMeter password={watchedPassword} />
          </div>

          {/* Confirm New Password */}
          <div>
            <Label htmlFor="password_confirmation" className="text-foreground" required>
              {t('resetPassword.passwordConfirmation')}
            </Label>
            <div className="relative mt-1.5">
              <div
                className={`absolute inset-y-0 ${
                  isRtl ? 'right-0 pr-3' : 'left-0 pl-3'
                } flex items-center pointer-events-none text-foreground-muted`}
              >
                <Lock className="h-4 w-4" />
              </div>
              <Input
                id="password_confirmation"
                type={showConfirmPassword ? 'text' : 'password'}
                dir="ltr"
                placeholder={t('resetPassword.passwordConfirmationPlaceholder')}
                disabled={isLoading}
                className={`${
                  isRtl ? 'pr-9 pl-10 text-right' : 'pl-9 pr-10 text-left'
                } h-11 border-border-input bg-surface focus:bg-surface text-foreground transition-colors ${
                  passwordConfirmationError
                    ? 'border-destructive focus-visible:ring-destructive'
                    : ''
                }`}
                {...register('password_confirmation')}
              />
              <button
                type="button"
                tabIndex={-1}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                className={`absolute top-0 h-full px-3 flex items-center cursor-pointer text-foreground-muted hover:text-foreground transition-colors ${
                  isRtl ? 'left-0' : 'right-0'
                }`}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {passwordConfirmationError && (
              <p className="text-xs text-destructive font-medium mt-1">
                {passwordConfirmationError}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 cursor-pointer bg-university-primary hover:bg-university-secondary text-white font-medium mt-3 shadow-sm transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <RotateCw className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {isLoading ? t('resetPassword.submitting') : t('resetPassword.submit')}
          </Button>
        </form>

        {/* Back to Login Link */}
        <div className="pt-2 text-center border-t border-border">
          <button
            type="button"
            className="text-sm text-university-primary font-medium hover:underline focus:outline-none cursor-pointer inline-flex items-center gap-1.5"
            onClick={onBackToLogin}
          >
            {isRtl ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
            {t('resetPassword.backToLogin')}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
