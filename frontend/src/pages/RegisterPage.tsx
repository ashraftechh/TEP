import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { VerifyEmailNotice } from '@/components/auth/VerifyEmailNotice';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useAppDispatch, useAppSelector } from '@/store';
import { fetchMajors } from '@/store/slices/lookupSlice';
import { resetAuthState } from '@/store/slices/authSlice';

export function RegisterPage() {
  const { t, i18n } = useTranslation(['auth', 'common']);
  const currentLang = i18n.language || 'ar';
  const navigate = useNavigate();

  const dispatch = useAppDispatch();
  const { majors, isLoadingMajors } = useAppSelector((state) => state.lookup);
  const { status: authStatus, registeredEmail } = useAppSelector((state) => state.auth);

  useEffect(() => {
    dispatch(fetchMajors());
  }, [dispatch]);

  useEffect(() => {
    if (authStatus === 'succeeded') {
      document.title = `${t('verificationNotice.title')} | ${t('common:pageTitleSuffix', 'منصة التدريب التعاوني')}`;
    } else {
      document.title = `${t('register.title')} | ${t('common:pageTitleSuffix', 'منصة التدريب التعاوني')}`;
    }
  }, [t, currentLang, authStatus]);

  const handleSwitchToLogin = () => {
    dispatch(resetAuthState());
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-surface-secondary text-foreground flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors duration-200">
      {/* Top Navbar: Language Switcher & Theme Toggle */}
      <div className="absolute top-4 end-4 z-10 flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-lg px-4">
        {authStatus === 'succeeded' ? (
          <VerifyEmailNotice email={registeredEmail} onBackToLogin={handleSwitchToLogin} />
        ) : (
          <RegisterForm
            majors={majors}
            isLoadingLookups={isLoadingMajors}
            onSwitchToLogin={handleSwitchToLogin}
          />
        )}
      </div>
    </div>
  );
}
