import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Logo } from '@/components/Logo';
import { AlertTriangle, ArrowLeft, ArrowRight, RotateCw } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store';
import { resetPassword, clearAuthError } from '@/store/slices/authSlice';
import type { ResetPasswordFormValues } from '@/lib/validations/auth';

export function ResetPasswordPage() {
  const { t, i18n } = useTranslation(['auth', 'common']);
  const currentLang = i18n.language || 'ar';
  const isRtl = currentLang === 'ar';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const dispatch = useAppDispatch();
  const { status, error, validationErrors } = useAppSelector((state) => state.auth);

  const [isTokenInvalid, setIsTokenInvalid] = useState(false);
  const [tokenErrorMessage, setTokenErrorMessage] = useState<string | null>(null);

  const isMissingParams = !token || !email;

  useEffect(() => {
    document.title = `${t('resetPassword.title')} | ${t('common:pageTitleSuffix', 'منصة التدريب التعاوني')}`;
  }, [t, currentLang]);

  // Clear errors when navigating away or unmounting
  useEffect(() => {
    return () => {
      dispatch(clearAuthError());
    };
  }, [dispatch]);

  const handleResetSubmit = async (data: ResetPasswordFormValues) => {
    dispatch(clearAuthError());
    setIsTokenInvalid(false);
    setTokenErrorMessage(null);

    const resultAction = await dispatch(
      resetPassword({
        token: token || data.token,
        email: data.email,
        password: data.password,
        password_confirmation: data.password_confirmation,
      })
    );

    if (resetPassword.fulfilled.match(resultAction)) {
      navigate('/login', {
        state: {
          successMessage: t('resetPassword.successNotification'),
        },
        replace: true,
      });
    } else if (resetPassword.rejected.match(resultAction)) {
      const payload = resultAction.payload;
      const emailErrors = payload?.errors?.email;

      // Check if the rejection was due to invalid/expired token
      if (
        emailErrors &&
        emailErrors.length > 0 &&
        (emailErrors[0].includes('token') ||
          emailErrors[0].includes('رمز') ||
          emailErrors[0].includes('invalid') ||
          emailErrors[0].includes('غير صالح'))
      ) {
        setIsTokenInvalid(true);
        setTokenErrorMessage(emailErrors[0]);
      }
    }
  };

  const handleBackToLogin = () => {
    dispatch(clearAuthError());
    navigate('/login');
  };

  const handleRequestNewLink = () => {
    dispatch(clearAuthError());
    navigate('/forgot-password');
  };

  return (
    <div className="min-h-screen bg-surface-secondary text-foreground flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors duration-200">
      {/* Top Navbar: Language Switcher & Theme Toggle */}
      <div className="absolute top-4 inset-e-4 z-10 flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-lg px-4">
        {/* State 1: Missing Token or Email in URL */}
        {isMissingParams ? (
          <Card
            className="w-full max-w-lg mx-auto shadow-lg bg-surface border-border animate-in fade-in zoom-in-95 duration-200"
            dir={isRtl ? 'rtl' : 'ltr'}
            data-testid="reset-password-missing-params"
          >
            <CardHeader className="space-y-4 text-center pb-4">
              <div className="flex justify-center">
                <Logo size="md" showSubtitle={true} />
              </div>

              <div className="flex justify-center pt-2">
                <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-inner">
                  <AlertTriangle className="h-8 w-8" />
                </div>
              </div>

              <div className="space-y-1.5">
                <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
                  {t('resetPassword.missingParamsTitle')}
                </CardTitle>
                <CardDescription className="text-sm text-foreground-muted max-w-sm mx-auto">
                  {t('resetPassword.missingParamsMessage')}
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <Button
                type="button"
                onClick={handleRequestNewLink}
                className="w-full h-11 cursor-pointer bg-university-primary hover:bg-university-secondary text-white font-medium flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <RotateCw className="h-4 w-4" />
                {t('resetPassword.requestNewLink')}
              </Button>

              <div className="text-center pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="text-sm text-university-primary font-medium hover:underline focus:outline-none cursor-pointer inline-flex items-center gap-1.5"
                >
                  {isRtl ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
                  {t('resetPassword.backToLogin')}
                </button>
              </div>
            </CardContent>
          </Card>
        ) : isTokenInvalid ? (
          /* State 2: Token Invalid or Expired */
          <Card
            className="w-full max-w-lg mx-auto shadow-lg bg-surface border-border animate-in fade-in zoom-in-95 duration-200"
            dir={isRtl ? 'rtl' : 'ltr'}
            data-testid="reset-password-invalid-token"
          >
            <CardHeader className="space-y-4 text-center pb-4">
              <div className="flex justify-center">
                <Logo size="md" showSubtitle={true} />
              </div>

              <div className="flex justify-center pt-2">
                <div className="w-16 h-16 rounded-full bg-destructive-light dark:bg-destructive/20 flex items-center justify-center text-destructive shadow-inner">
                  <AlertTriangle className="h-8 w-8" />
                </div>
              </div>

              <div className="space-y-1.5">
                <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
                  {t('resetPassword.invalidTokenTitle')}
                </CardTitle>
                <CardDescription className="text-sm text-foreground-muted max-w-sm mx-auto">
                  {tokenErrorMessage || t('resetPassword.invalidTokenMessage')}
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <Button
                type="button"
                onClick={handleRequestNewLink}
                className="w-full h-11 cursor-pointer bg-university-primary hover:bg-university-secondary text-white font-medium flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <RotateCw className="h-4 w-4" />
                {t('resetPassword.requestNewLink')}
              </Button>

              <div className="text-center pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="text-sm text-university-primary font-medium hover:underline focus:outline-none cursor-pointer inline-flex items-center gap-1.5"
                >
                  {isRtl ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
                  {t('resetPassword.backToLogin')}
                </button>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* State 3: Active Reset Password Form */
          <ResetPasswordForm
            token={token}
            defaultEmail={email}
            onSubmit={handleResetSubmit}
            onBackToLogin={handleBackToLogin}
            isLoading={status === 'loading'}
            errorMessage={error}
            serverValidationErrors={validationErrors}
          />
        )}
      </div>
    </div>
  );
}

export default ResetPasswordPage;
