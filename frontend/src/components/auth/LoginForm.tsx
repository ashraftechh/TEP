import React, { useState } from 'react';
import { Link } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/Logo';
import { localizeAuthError } from '@/lib/localizeError';
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, RotateCw, LogIn } from 'lucide-react';
import { cn } from '@/lib/utils';

import { createLoginSchema, type LoginFormValues } from '@/lib/validations/auth';

export type { LoginFormValues };

export interface LoginFormProps {
  onSubmit?: (data: LoginFormValues) => Promise<void> | void;
  onSwitchToRegister?: () => void;
  onForgotPassword?: () => void;
  isLoading?: boolean;
  errorMessage?: string | null;
  errorCode?: string | null;
  serverValidationErrors?: Record<string, string[]> | null;
  successMessage?: string | null;
}

export function LoginForm({
  onSubmit,
  onSwitchToRegister,
  onForgotPassword,
  isLoading = false,
  errorMessage = null,
  errorCode = null,
  serverValidationErrors = null,
  successMessage = null,
}: LoginFormProps) {
  const { t, i18n } = useTranslation('auth');
  const isRtl = i18n.language === 'ar';

  const [showPassword, setShowPassword] = useState(false);

  const schema = React.useMemo(() => createLoginSchema(t), [t]);

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    trigger,
    formState: { errors, isSubmitted },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
      remember: false,
    },
  });

  // Apply server-side 422 validation errors to corresponding form fields
  React.useEffect(() => {
    if (serverValidationErrors) {
      Object.entries(serverValidationErrors).forEach(([field, messages]) => {
        if (messages && messages.length > 0 && (field === 'email' || field === 'password')) {
          const localizedMsg = localizeAuthError(messages[0], t) || messages[0];
          setError(field, {
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

  const getFieldError = (field: keyof LoginFormValues): string | undefined => {
    if (errors[field]?.message) return errors[field]?.message;
    const serverErr = serverValidationErrors?.[field];
    if (serverErr && serverErr.length > 0) {
      return localizeAuthError(serverErr[0], t) || serverErr[0];
    }
    return undefined;
  };

  const handleFormSubmit = async (data: LoginFormValues) => {
    if (onSubmit) {
      await onSubmit(data);
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

  return (
    <Card
      className="w-full max-w-lg mx-auto shadow-lg bg-surface border-border"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <CardHeader className="space-y-3 text-center pb-4">
        {/* Shared Reusable Logo Component with Platform & University Lockup */}
        <div className="flex justify-center">
          <Logo size="md" showSubtitle={true} />
        </div>

        <div className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
            {t('login.title')}
          </CardTitle>
          <CardDescription className="text-sm text-foreground-muted">
            {t('login.subtitle')}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Success Banner */}
        {successMessage && (
          <div
            role="status"
            className="flex items-center gap-2 p-3 text-sm rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 animate-in fade-in duration-150"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Banner */}
        {errorMessage && (
          <div
            role="alert"
            className="flex items-center gap-2 p-3 text-sm rounded-md bg-destructive-light dark:bg-destructive/20 text-destructive border border-destructive/30 animate-in fade-in duration-150"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{localizeAuthError(errorMessage, t, errorCode)}</span>
          </div>
        )}

        {/* 1. Local Login Form */}
        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="space-y-4.5"
          noValidate
          data-testid="login-form"
        >
          {/* Email Address */}
          <div>
            <Label htmlFor="email" className="text-foreground" required>
              {t('login.email')}
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
                placeholder={t('login.emailPlaceholder')}
                disabled={isLoading}
                aria-invalid={!!getFieldError('email')}
                className={`${
                  isRtl ? 'pr-9 pl-3 text-right' : 'pl-9 pr-3 text-left'
                } h-11 border-border-input bg-surface focus:bg-surface text-foreground transition-colors`}
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

          {/* Password */}
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-foreground" required>
                {t('login.password')}
              </Label>
              <button
                type="button"
                onClick={onForgotPassword}
                className="text-xs text-university-primary font-medium hover:underline focus:outline-none cursor-pointer"
              >
                {t('login.forgotPassword')}
              </button>
            </div>
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
                placeholder={t('login.passwordPlaceholder')}
                disabled={isLoading}
                aria-invalid={!!getFieldError('password')}
                className={`${
                  isRtl ? 'pr-9 pl-10 text-right' : 'pl-9 pr-10 text-left'
                } h-11 border-border-input bg-surface focus:bg-surface text-foreground transition-colors`}
                {...register('password', {
                  onChange: () => {
                    if (getFieldError('password')) clearErrors('password');
                  },
                })}
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
            {getFieldError('password') && (
              <p className="text-xs text-destructive font-medium mt-1">
                {getFieldError('password')}
              </p>
            )}
          </div>

          {/* Remember Me Checkbox */}
          <div className="flex items-center gap-2 pt-0.5">
            <input
              id="remember"
              type="checkbox"
              className="h-4 w-4 rounded border-border-input text-university-primary focus:ring-university-primary cursor-pointer"
              {...register('remember')}
            />
            <Label
              htmlFor="remember"
              className="text-xs text-foreground-muted font-normal cursor-pointer select-none"
            >
              {t('login.rememberMe', 'Remember me')}
            </Label>
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
              <LogIn className={cn('h-4 w-4', isRtl && 'scale-x-[-1]')} />
            )}
            {isLoading ? t('login.submitting') : t('login.submit')}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center py-1">
          <div className="grow border-t border-border" />
          <span className="shrink mx-4 text-xs uppercase font-medium text-foreground-muted">
            {t('login.orDivider')}
          </span>
          <div className="grow border-t border-border" />
        </div>

        {/* 2. SSO OAuth Social Login Buttons */}
        <div className="space-y-2.5">
          {/* Google SSO Button */}
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
            {t('login.continueWithGoogle')}
          </Button>

          {/* Microsoft SSO Button */}
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
            {t('login.continueWithMicrosoft')}
          </Button>
        </div>

        {/* 3. Switch to Register */}
        <div className="pt-2 text-center">
          <p className="text-sm text-foreground-muted">
            {t('login.noAccount')}{' '}
            <button
              type="button"
              className="text-university-primary font-medium hover:underline focus:outline-none cursor-pointer"
              onClick={onSwitchToRegister}
            >
              {t('login.signupLink')}
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
