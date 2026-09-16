import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { CompleteRegistrationForm } from '@/components/auth/CompleteRegistrationForm';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useAppDispatch, useAppSelector } from '@/store';
import { completeRegistration, clearAuthError } from '@/store/slices/authSlice';
import { fetchMajors } from '@/store/slices/lookupSlice';
import { resolveDashboardPath } from '@/lib/auth';
import type { CompleteRegistrationFormValues } from '@/lib/validations/auth';

export function CompleteRegistrationPage() {
  const { t, i18n } = useTranslation(['auth', 'common']);
  const currentLang = i18n.language || 'ar';
  const navigate = useNavigate();

  const dispatch = useAppDispatch();
  const { user, status, error, errorCode, validationErrors } = useAppSelector(
    (state) => state.auth
  );
  const { majors, isLoadingMajors } = useAppSelector((state) => state.lookup);

  useEffect(() => {
    document.title = `${t('completeRegistration.title')} | ${t('common:pageTitleSuffix', 'منصة التدريب التعاوني')}`;
  }, [t, currentLang]);

  // Load lookup data on mount
  useEffect(() => {
    dispatch(fetchMajors());
  }, [dispatch]);

  // Clear errors when unmounting
  useEffect(() => {
    return () => {
      dispatch(clearAuthError());
    };
  }, [dispatch]);

  const handleCompleteSubmit = async (values: CompleteRegistrationFormValues) => {
    dispatch(clearAuthError());

    const resultAction = await dispatch(completeRegistration(values));

    if (completeRegistration.fulfilled.match(resultAction)) {
      const updatedUser = resultAction.payload.data;
      navigate(resolveDashboardPath(updatedUser), { replace: true });
    } else if (completeRegistration.rejected.match(resultAction)) {
      const payload = resultAction.payload;
      if (payload?.error_code === 'registration_already_complete') {
        navigate('/dashboard', { replace: true });
      }
    }
  };

  return (
    <div className="min-h-screen bg-surface-secondary text-foreground flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors duration-200">
      {/* Top Navbar: Language Switcher & Theme Toggle */}
      <div className="absolute top-4 end-4 z-10 flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-lg px-4">
        <CompleteRegistrationForm
          user={user}
          onSubmit={handleCompleteSubmit}
          majors={majors}
          isLoadingLookups={isLoadingMajors}
          isLoading={status === 'loading'}
          errorMessage={errorCode !== 'registration_already_complete' ? error : null}
          serverValidationErrors={validationErrors}
        />
      </div>
    </div>
  );
}

export default CompleteRegistrationPage;
