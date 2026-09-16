import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { ForgotPasswordNotice } from '@/components/auth/ForgotPasswordNotice';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useAppDispatch, useAppSelector } from '@/store';
import { forgotPassword, clearAuthError } from '@/store/slices/authSlice';
import type { ForgotPasswordFormValues } from '@/lib/validations/auth';

export function ForgotPasswordPage() {
  const { t, i18n } = useTranslation(['auth', 'common']);
  const currentLang = i18n.language || 'ar';
  const navigate = useNavigate();

  const dispatch = useAppDispatch();
  const { status, error, validationErrors } = useAppSelector((state) => state.auth);

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  useEffect(() => {
    document.title = `${t('forgotPassword.title')} | ${t('common:pageTitleSuffix', 'منصة التدريب التعاوني')}`;
  }, [t, currentLang]);

  // Clear errors when navigating away or unmounting
  useEffect(() => {
    return () => {
      dispatch(clearAuthError());
    };
  }, [dispatch]);

  const handleForgotPasswordSubmit = async (data: ForgotPasswordFormValues) => {
    dispatch(clearAuthError());

    const resultAction = await dispatch(forgotPassword(data));

    // Both fulfilled and rejected non-enumeration responses (200) transition to confirmation.
    // In case of network errors or validation failures (422), errors are displayed.
    if (forgotPassword.fulfilled.match(resultAction)) {
      setSubmittedEmail(data.email);
      setIsSubmitted(true);
    }
  };

  const handleBackToLogin = () => {
    dispatch(clearAuthError());
    navigate('/login');
  };

  const handleResend = () => {
    setIsSubmitted(false);
    dispatch(clearAuthError());
  };

  return (
    <div className="min-h-screen bg-surface-secondary text-foreground flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors duration-200">
      {/* Top Navbar: Language Switcher & Theme Toggle */}
      <div className="absolute top-4 end-4 z-10 flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-lg px-4">
        {isSubmitted ? (
          <ForgotPasswordNotice
            email={submittedEmail}
            onBackToLogin={handleBackToLogin}
            onResend={handleResend}
          />
        ) : (
          <ForgotPasswordForm
            onSubmit={handleForgotPasswordSubmit}
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

export default ForgotPasswordPage;
