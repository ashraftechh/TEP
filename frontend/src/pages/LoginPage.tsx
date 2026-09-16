import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router';
import { LoginForm } from '@/components/auth/LoginForm';
import { VerifyEmailNotice } from '@/components/auth/VerifyEmailNotice';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useToast } from '@/context/ToastContext';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  loginUser,
  fetchCurrentUser,
  clearAuthError,
  resetAuthState,
  setRegisteredEmail,
} from '@/store/slices/authSlice';
import { resolveDashboardPath } from '@/lib/auth';
import type { LoginFormValues } from '@/lib/validations/auth';

export function LoginPage() {
  const { t, i18n } = useTranslation(['auth', 'common']);
  const currentLang = i18n.language || 'ar';
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const dispatch = useAppDispatch();
  const { status, error, errorCode, validationErrors } = useAppSelector((state) => state.auth);

  const [showVerificationNotice, setShowVerificationNotice] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const successMessage =
    (location.state as { successMessage?: string } | null)?.successMessage || null;

  useEffect(() => {
    if (showVerificationNotice) {
      document.title = `${t('verificationNotice.title')} | ${t('common:pageTitleSuffix', 'منصة التدريب التعاوني')}`;
    } else {
      document.title = `${t('login.title')} | ${t('common:pageTitleSuffix', 'منصة التدريب التعاوني')}`;
    }
  }, [t, currentLang, showVerificationNotice]);

  // Clear errors when navigating away or switching views
  useEffect(() => {
    return () => {
      dispatch(clearAuthError());
    };
  }, [dispatch]);

  const handleLoginSubmit = async (data: LoginFormValues) => {
    dispatch(clearAuthError());

    const resultAction = await dispatch(loginUser(data));

    if (loginUser.fulfilled.match(resultAction)) {
      const user = resultAction.payload.data;
      toast.success(
        t('common:toast.welcomeBack', {
          name: user.name,
          defaultValue: `مرحباً بعودتك، ${user.name}!`,
        })
      );
      const from = (location.state as { from?: string })?.from;
      if (from) {
        navigate(from, { replace: true });
      } else {
        const targetPath = resolveDashboardPath(user);
        navigate(targetPath);
      }
    } else if (loginUser.rejected.match(resultAction)) {
      const payload = resultAction.payload;

      // Handle unverified email: show verification notice with resend option
      if (payload?.error_code === 'email_not_verified') {
        setUnverifiedEmail(data.email);
        dispatch(setRegisteredEmail(data.email));
        setShowVerificationNotice(true);
      } else if (payload?.error_code === 'registration_incomplete') {
        navigate('/complete-registration');
      } else if (payload?.status === 409) {
        // User already has an active session on the backend
        const meAction = await dispatch(fetchCurrentUser());
        if (fetchCurrentUser.fulfilled.match(meAction)) {
          const from = (location.state as { from?: string })?.from;
          if (from) {
            navigate(from, { replace: true });
          } else {
            navigate(resolveDashboardPath(meAction.payload.data));
          }
        }
      }
    }
  };

  const handleSwitchToRegister = () => {
    dispatch(resetAuthState());
    navigate('/register');
  };

  const handleForgotPassword = () => {
    navigate('/forgot-password');
  };

  const handleBackToLoginFromNotice = () => {
    setShowVerificationNotice(false);
    dispatch(clearAuthError());
  };

  return (
    <div className="min-h-screen bg-surface-secondary text-foreground flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors duration-200">
      {/* Top Navbar: Language Switcher & Theme Toggle */}
      <div className="absolute top-4 inset-e-4 z-10 flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-lg px-4">
        {showVerificationNotice ? (
          <VerifyEmailNotice
            email={unverifiedEmail}
            onBackToLogin={handleBackToLoginFromNotice}
            showResend={true}
          />
        ) : (
          <LoginForm
            onSubmit={handleLoginSubmit}
            onSwitchToRegister={handleSwitchToRegister}
            onForgotPassword={handleForgotPassword}
            isLoading={status === 'loading'}
            errorMessage={errorCode !== 'email_not_verified' ? error : null}
            errorCode={errorCode}
            serverValidationErrors={validationErrors}
            successMessage={successMessage}
          />
        )}
      </div>
    </div>
  );
}

export default LoginPage;
