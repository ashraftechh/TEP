import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LanguageSwitcherProps {
  className?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ className }) => {
  const { i18n } = useTranslation('auth');
  const isRTL = (i18n.language || 'ar') === 'ar';

  const toggleLanguage = () => {
    i18n.changeLanguage(isRTL ? 'en' : 'ar');
  };

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className={cn(
        'flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-university-primary transition-colors cursor-pointer py-1 px-2 rounded-md',
        className
      )}
      aria-label="Toggle language"
      title={isRTL ? 'English' : 'العربية'}
    >
      <span className="hidden sm:inline">{isRTL ? 'English' : 'العربية'}</span>
      <Globe className="h-4 w-4 text-foreground-muted shrink-0" />
    </button>
  );
};

export default LanguageSwitcher;
