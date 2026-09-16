import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Circle } from 'lucide-react';
import { checkPasswordCriteria } from '@/lib/validations/auth';
import { cn } from '@/lib/utils';

export interface PasswordStrengthMeterProps {
  password?: string;
  showRequirements?: boolean;
  className?: string;
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({
  password = '',
  showRequirements = true,
  className,
}) => {
  const { t, i18n } = useTranslation('auth');
  const isRtl = i18n.language === 'ar';

  const criteria = checkPasswordCriteria(password);
  const hasInput = password.length > 0;

  // Strength score to label & color
  const getStrengthInfo = (score: number) => {
    if (score <= 1) {
      return {
        label: t('passwordStrength.weak', 'Weak'),
        color: 'bg-destructive',
        textColor: 'text-destructive',
        percent: 20,
      };
    }
    if (score === 2) {
      return {
        label: t('passwordStrength.fair', 'Fair'),
        color: 'bg-amber-500',
        textColor: 'text-amber-500',
        percent: 40,
      };
    }
    if (score === 3 || score === 4) {
      return {
        label: t('passwordStrength.good', 'Good'),
        color: 'bg-blue-500',
        textColor: 'text-blue-500',
        percent: 75,
      };
    }
    return {
      label: t('passwordStrength.strong', 'Strong'),
      color: 'bg-emerald-500',
      textColor: 'text-emerald-600 dark:text-emerald-400',
      percent: 100,
    };
  };

  const strength = getStrengthInfo(criteria.score);

  const requirements = [
    {
      key: 'minLength',
      label: t('passwordRules.minLength', 'At least 8 characters'),
      met: criteria.hasMinLength,
    },
    {
      key: 'uppercase',
      label: t('passwordRules.uppercase', 'At least one uppercase letter (A-Z)'),
      met: criteria.hasUppercase,
    },
    {
      key: 'lowercase',
      label: t('passwordRules.lowercase', 'At least one lowercase letter (a-z)'),
      met: criteria.hasLowercase,
    },
    {
      key: 'number',
      label: t('passwordRules.number', 'At least one number (0-9)'),
      met: criteria.hasNumber,
    },
    {
      key: 'symbol',
      label: t('passwordRules.symbol', 'At least one special symbol (!@#$%^&*)'),
      met: criteria.hasSymbol,
    },
  ];

  if (!hasInput && !showRequirements) {
    return null;
  }

  return (
    <div
      className={cn('space-y-2 mt-2 pt-1 animate-in fade-in duration-200', className)}
      dir={isRtl ? 'rtl' : 'ltr'}
      aria-live="polite"
    >
      {/* Strength Bar & Score Label */}
      {hasInput && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-foreground-muted">
              {t('passwordStrength.label', 'Password Strength')}:
            </span>
            <span className={cn('font-semibold', strength.textColor)}>{strength.label}</span>
          </div>

          <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full bg-surface-secondary rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300',
                criteria.score >= 1 ? strength.color : 'bg-transparent'
              )}
            />
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300',
                criteria.score >= 2 ? strength.color : 'bg-transparent'
              )}
            />
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300',
                criteria.score >= 3 ? strength.color : 'bg-transparent'
              )}
            />
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300',
                criteria.score >= 5 ? strength.color : 'bg-transparent'
              )}
            />
          </div>
        </div>
      )}

      {/* Requirements Live Checklist */}
      {showRequirements && (
        <div className="rounded-lg p-2.5 bg-surface-secondary/60 border border-border/60 text-xs space-y-1.5">
          <p className="font-semibold text-foreground-muted text-[11px] mb-1">
            {t('passwordRules.title', 'Password Requirements')}:
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-1">
            {requirements.map((req) => (
              <li
                key={req.key}
                className={cn(
                  'flex items-center gap-1.5 transition-colors duration-150',
                  req.met
                    ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                    : 'text-foreground-muted'
                )}
              >
                {req.met ? (
                  <Check className="h-3.5 w-3.5 flex-shrink-0 text-emerald-500 animate-in zoom-in duration-150" />
                ) : (
                  <Circle className="h-3 w-3 flex-shrink-0 opacity-40" />
                )}
                <span className="text-[11px] leading-tight">{req.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PasswordStrengthMeter;
