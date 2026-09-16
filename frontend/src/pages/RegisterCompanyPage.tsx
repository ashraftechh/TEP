import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { CheckCircle2, ArrowLeft, ArrowRight } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { RegisterCompanyForm } from '@/components/companies/RegisterCompanyForm';
import { useAppDispatch, useAppSelector } from '@/store';
import { fetchIndustries } from '@/store/slices/lookupSlice';
import { resetCompanyRequestState } from '@/store/slices/companySlice';

export function RegisterCompanyPage() {
  const { t, i18n } = useTranslation(['companies', 'common']);
  const lang = i18n.language || 'ar';

  const dispatch = useAppDispatch();
  const { industries, isLoadingIndustries } = useAppSelector((state) => state.lookup);
  const { status } = useAppSelector((state) => state.company);

  const isSucceeded = status === 'succeeded';

  useEffect(() => {
    dispatch(fetchIndustries());
    // Reset state on unmount to avoid stale success state
    return () => {
      dispatch(resetCompanyRequestState());
    };
  }, [dispatch]);

  useEffect(() => {
    document.title = `${t('companies:companyRequest.pageTitle')} | ${t('common:pageTitleSuffix', 'منصة التدريب التعاوني')}`;
  }, [t, lang]);

  return (
    <div className="min-h-screen bg-surface-secondary text-foreground flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors duration-200">
      {/* Top bar: Language Switcher & Theme Toggle */}
      <div className="absolute top-4 end-4 z-10 flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-lg px-4">
        {isSucceeded ? (
          <SuccessView />
        ) : (
          <RegisterCompanyForm industries={industries} isLoadingIndustries={isLoadingIndustries} />
        )}
      </div>
    </div>
  );
}

/**
 * Confirmation view shown after a successful company registration request submission.
 */
function SuccessView() {
  const { t, i18n } = useTranslation(['companies', 'common']);
  const isRtl = i18n.language === 'ar';

  const steps = [
    t('companies:companyRequestSuccess.step1'),
    t('companies:companyRequestSuccess.step2'),
    t('companies:companyRequestSuccess.step3'),
  ];

  return (
    <div className="w-full rounded-2xl border border-border bg-surface shadow-sm overflow-hidden">
      {/* Success Banner */}
      <div className="bg-university-primary px-6 py-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
            <CheckCircle2 className="h-9 w-9 text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white">
          {t('companies:companyRequestSuccess.title')}
        </h1>
        <p className="text-white/80 text-sm mt-1">
          {t('companies:companyRequestSuccess.subtitle')}
        </p>
      </div>

      <div className="px-6 py-7 space-y-6">
        {/* Message */}
        <p className="text-foreground-muted text-sm leading-relaxed text-start">
          {t('companies:companyRequestSuccess.message')}
        </p>

        {/* Next Steps */}
        <div>
          <h2 className="text-foreground font-semibold text-sm mb-3 text-start">
            {t('companies:companyRequestSuccess.nextSteps')}
          </h2>
          <ol className="space-y-3">
            {steps.map((text, index) => (
              <li key={index} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-university-primary/10 flex items-center justify-center mt-0.5">
                  <span className="text-university-primary text-xs font-bold">{index + 1}</span>
                </div>
                <p className="text-foreground-muted text-sm leading-relaxed">{text}</p>
              </li>
            ))}
          </ol>
        </div>

        {/* Back to Login */}
        <Link
          to="/login"
          className="flex items-center justify-center gap-2 w-full h-11 rounded-md bg-university-primary text-white font-semibold hover:bg-university-secondary transition-colors cursor-pointer shadow-sm"
        >
          {isRtl ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
          <span>{t('companies:companyRequestSuccess.backToLogin')}</span>
        </Link>
      </div>
    </div>
  );
}
