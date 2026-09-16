import React from 'react';
import { useTranslation } from 'react-i18next';
import { GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';

/*
 * ─── Logo Component ───────────────────────────────────────────────────────────
 *
 * Horizontal brand lockup matching the university portal design:
 * [ Icon Badge ] [ Platform Name (Bold) / University Name (Subtitle) ]
 *
 * TODO: Swap the placeholder badge and text for official brand SVG assets
 *       once provided by the university visual identity team.
 */

export interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showSubtitle?: boolean;
  hideTextOnMobile?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  className = '',
  showSubtitle = true,
  hideTextOnMobile = false,
}) => {
  const { i18n } = useTranslation('auth');
  const isAr = i18n.language === 'ar';

  const badgeSizes = {
    sm: 'w-9 h-9 rounded-lg text-sm',
    md: 'w-11 h-11 rounded-xl text-base',
    lg: 'w-14 h-14 rounded-2xl text-xl',
  };

  const iconSizes = {
    sm: 'h-5 w-5',
    md: 'h-6 w-6',
    lg: 'h-7 w-7',
  };

  const titleSizes = {
    sm: 'text-sm font-bold',
    md: 'text-base font-bold',
    lg: 'text-lg font-extrabold',
  };

  const subtitleSizes = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm',
  };

  return (
    <div className={cn('inline-flex items-center gap-3', className)} dir={isAr ? 'rtl' : 'ltr'}>
      {/* Brand Icon / Lettermark Badge */}
      <div
        className={cn(
          'flex-shrink-0 inline-flex items-center justify-center bg-university-primary text-white font-bold shadow-md transition-colors',
          badgeSizes[size]
        )}
      >
        <GraduationCap className={iconSizes[size]} />
      </div>

      {/* Brand Platform & University Text */}
      <div className={cn(isAr ? 'text-right' : 'text-left', hideTextOnMobile && 'hidden sm:block')}>
        <span
          className={cn(
            'block text-foreground font-bold tracking-tight leading-snug transition-colors',
            titleSizes[size]
          )}
        >
          {isAr ? 'منصة التدريب التعاوني' : 'Cooperative Training Platform'}
        </span>
        {showSubtitle && (
          <span
            className={cn(
              'block text-foreground-muted font-normal leading-tight transition-colors',
              subtitleSizes[size],
              hideTextOnMobile && 'hidden md:block'
            )}
          >
            {isAr ? 'جامعة إقليم سبأ' : 'Saba Region University'}
          </span>
        )}
      </div>
    </div>
  );
};
