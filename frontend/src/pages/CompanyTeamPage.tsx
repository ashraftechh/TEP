import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CompanyRepresentativesSection } from '@/components/profile/CompanyRepresentativesSection';

export const CompanyTeamPage: React.FC = () => {
  const { t, i18n } = useTranslation(['companies', 'common']);
  const isArabic = i18n.language === 'ar';

  useEffect(() => {
    document.title = `${t('representativesManagement.title', 'Company Representatives')} | ${t('common:pageTitleSuffix', 'منصة التدريب التعاوني')}`;
  }, [t, isArabic]);

  return (
    <div dir={isArabic ? 'rtl' : 'ltr'} className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="pb-2 border-b border-border">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
          {t('representativesManagement.title', 'Company Representatives')}
        </h1>
        <p className="text-sm text-foreground-muted mt-1">
          {t(
            'representativesManagement.subtitle',
            "Manage your company's team members, roles, and access."
          )}
        </p>
      </div>

      {/* Representatives Management Section */}
      <CompanyRepresentativesSection />
    </div>
  );
};

export default CompanyTeamPage;
