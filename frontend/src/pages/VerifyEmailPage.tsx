import { useEffect, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  verifyEmail,
  resendVerificationEmail,
  logoutUser,
  fetchCurrentUser,
  resetVerificationState,
} from '@/store/slices/authSlice';
import { useToast } from '@/context/ToastContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { VerifyEmailNotice } from '@/components/auth/VerifyEmailNotice';
import { AppLoadingScreen } from '@/components/routing/AppLoadingScreen';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  XCircle,
  RotateCw,
  LayoutDashboard,
  AlertTriangle,
  Mail,
  LogIn,
} from 'lucide-react';

export function VerifyEmailPage() {
  const { t, i18n } = useTranslation(['auth', 'common', 'profile']);
  const currentLang = i18n.language || 'ar';
  const isRtl = currentLang === 'ar';
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const toast = useToast();

  const params = useParams<{ id?: string; hash?: string }>();
  const [searchParams] = useSearchParams();

  // Support both path params (/verify-email/:id/:hash) and query params (/verify-email?id=...&hash=...)
  const id = params.id || searchParams.get('id');
  const hash = params.hash || searchParams.get('hash');
  const expires = searchParams.get('expires');
  const signature = searchParams.get('signature');

  const hasVerificationTokens = Boolean(id && hash);

  const {
    user,
    isInitializing,
    verificationStatus,
    verificationError,
    isLoginRequiredForVerification,
    registeredEmail,
  } = useAppSelector((state) => state.auth);

  useEffect(() => {
    document.title = `${t('verifyEmail.title')} | ${t('common:pageTitleSuffix', 'منصة التدريب التعاوني')}`;
  }, [t, currentLang]);

  // 1. If logged out and visits /verify-email directly (no tokens): redirect to /login
  useEffect(() => {
    if (!isInitializing && !hasVerificationTokens && !user) {
      navigate('/login', { replace: true });
    }
  }, [isInitializing, hasVerificationTokens, user, navigate]);

  // 2. If logged out and clicks verification link (tokens present): redirect to /login preserving the link in state
  useEffect(() => {
    if (!isInitializing && hasVerificationTokens && !user) {
      navigate('/login', {
        state: { from: location.pathname + location.search },
        replace: true,
      });
    }
  }, [isInitializing, hasVerificationTokens, user, navigate, location]);

  // 3. If logged in and not pending verification (incomplete SSO or active user): redirect appropriately
  useEffect(() => {
    if (!isInitializing && !hasVerificationTokens && user && user.status !== 'pending') {
      navigate(user.status === 'incomplete' ? '/complete-registration' : '/dashboard', {
        replace: true,
      });
    }
  }, [isInitializing, hasVerificationTokens, user, navigate]);

  // 4. Trigger verification if tokens are present and user is authenticated
  useEffect(() => {
    if (hasVerificationTokens && id && hash && user && verificationStatus === 'idle') {
      dispatch(
        verifyEmail({
          id,
          hash,
          expires,
          signature,
        })
      );
    }
  }, [hasVerificationTokens, id, hash, user, expires, signature, verificationStatus, dispatch]);

  const handleLogout = async () => {
    dispatch(resetVerificationState());
    await dispatch(logoutUser());
    navigate('/login');
  };

  const handleGoToDashboard = async () => {
    dispatch(resetVerificationState());
    await dispatch(fetchCurrentUser());
    navigate('/dashboard');
  };

  const handleGoToLogin = () => {
    dispatch(resetVerificationState());
    navigate('/login');
  };

  const handleResend = async () => {
    await dispatch(resendVerificationEmail()).unwrap();
  };

  const handleRequestNewLink = async () => {
    if (user) {
      try {
        await dispatch(resendVerificationEmail()).unwrap();
        toast.success(t('verificationNotice.resendSuccess'));
        dispatch(resetVerificationState());
        navigate('/verify-email');
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : t('common:toast.error'));
      }
    } else {
      dispatch(resetVerificationState());
      navigate('/login');
    }
  };

  const displayErrorMessage = useMemo(() => {
    if (!verificationError) return t('verifyEmail.errorMessage');
    const lower = verificationError.toLowerCase();
    if (
      lower.includes('invalid signature') ||
      lower.includes('signature') ||
      lower.includes('expired')
    ) {
      return t('verifyEmail.invalidSignatureMessage');
    }
    if (lower.includes('unauthorized') || lower.includes('unauthenticated')) {
      return t('verifyEmail.errorMessage');
    }
    return t('verifyEmail.errorMessage');
  }, [verificationError, t]);

  if (isInitializing) {
    return <AppLoadingScreen />;
  }

  // If no verification tokens in URL, render the unverified notice only for pending users
  if (!hasVerificationTokens) {
    if (!user || user.status !== 'pending') {
      return null;
    }

    return (
      <div className="min-h-screen bg-surface-secondary text-foreground flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors duration-200">
        <div className="absolute top-4 inset-e-4 z-10 flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>

        <div className="sm:mx-auto sm:w-full sm:max-w-lg px-4">
          <VerifyEmailNotice
            email={user.email || registeredEmail}
            showResend={true}
            onResendEmail={handleResend}
            onLogout={handleLogout}
          />
        </div>
      </div>
    );
  }

  // Token-based verification outcome view
  return (
    <div className="min-h-screen bg-surface-secondary text-foreground flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors duration-200">
      {/* Top Navbar: Language Switcher & Theme Toggle */}
      <div className="absolute top-4 inset-e-4 z-10 flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-lg px-4">
        <Card
          className="w-full shadow-lg bg-surface border-border animate-in fade-in zoom-in-95 duration-200"
          dir={isRtl ? 'rtl' : 'ltr'}
          data-testid="verify-email-outcome-card"
        >
          <CardHeader className="space-y-4 text-center pb-4">
            <div className="flex justify-center">
              <Logo size="md" showSubtitle={true} />
            </div>

            {/* Status Icon */}
            <div className="flex justify-center pt-2">
              {verificationStatus === 'loading' && (
                <div className="w-16 h-16 rounded-full bg-university-light dark:bg-university-primary/20 flex items-center justify-center text-university-primary dark:text-university-accent shadow-inner animate-pulse">
                  <RotateCw className="h-8 w-8 animate-spin" />
                </div>
              )}

              {verificationStatus === 'succeeded' && (
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-inner">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
              )}

              {verificationStatus === 'failed' && isLoginRequiredForVerification && (
                <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-inner">
                  <AlertTriangle className="h-8 w-8" />
                </div>
              )}

              {verificationStatus === 'failed' && !isLoginRequiredForVerification && (
                <div className="w-16 h-16 rounded-full bg-destructive-light dark:bg-destructive/20 flex items-center justify-center text-destructive shadow-inner">
                  <XCircle className="h-8 w-8" />
                </div>
              )}
            </div>

            {/* Title & Description */}
            <div className="space-y-1.5">
              {verificationStatus === 'loading' && (
                <>
                  <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
                    {t('verifyEmail.title')}
                  </CardTitle>
                  <CardDescription className="text-sm text-foreground-muted">
                    {t('verifyEmail.verifying')}
                  </CardDescription>
                </>
              )}

              {verificationStatus === 'succeeded' && (
                <>
                  <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
                    {t('verifyEmail.successTitle')}
                  </CardTitle>
                  <CardDescription className="text-sm text-foreground-muted max-w-sm mx-auto">
                    {t('verifyEmail.successMessage')}
                  </CardDescription>
                </>
              )}

              {verificationStatus === 'failed' && isLoginRequiredForVerification && (
                <>
                  <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
                    {t('verifyEmail.loginRequiredTitle')}
                  </CardTitle>
                  <CardDescription className="text-sm text-foreground-muted max-w-sm mx-auto">
                    {t('verifyEmail.loginRequiredMessage')}
                  </CardDescription>
                </>
              )}

              {verificationStatus === 'failed' && !isLoginRequiredForVerification && (
                <>
                  <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
                    {t('verifyEmail.errorTitle')}
                  </CardTitle>
                  <CardDescription className="text-sm text-destructive max-w-sm mx-auto">
                    {displayErrorMessage}
                  </CardDescription>
                </>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-4 pt-2">
            {verificationStatus === 'succeeded' && (
              <Button
                type="button"
                onClick={handleGoToDashboard}
                className="w-full h-11 cursor-pointer bg-university-primary hover:bg-university-secondary text-white font-medium flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <LayoutDashboard className="h-4 w-4" />
                {t('verifyEmail.goToDashboard')}
              </Button>
            )}

            {verificationStatus === 'failed' && (
              <div className="space-y-2">
                <Button
                  type="button"
                  onClick={handleGoToLogin}
                  className="w-full h-11 cursor-pointer bg-university-primary hover:bg-university-secondary text-white font-medium flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <LogIn className={cn('h-4 w-4', isRtl && 'scale-x-[-1]')} />
                  {t('verifyEmail.goToLogin')}
                </Button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={handleRequestNewLink}
                    className="text-xs text-university-primary hover:underline cursor-pointer inline-flex items-center gap-1"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    {t('verifyEmail.requestNewLink')}
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default VerifyEmailPage;
