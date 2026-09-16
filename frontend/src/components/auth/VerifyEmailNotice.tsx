import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { MailCheck, Send, RotateCw, CheckCircle2, AlertCircle, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface VerifyEmailNoticeProps {
  email?: string | null;
  onBackToLogin?: () => void;
  onLogout?: () => void;
  onResendEmail?: () => Promise<void> | void;
  showResend?: boolean;
}

export function VerifyEmailNotice({
  email,
  onBackToLogin,
  onLogout,
  onResendEmail,
  showResend = !!onResendEmail,
}: VerifyEmailNoticeProps) {
  const { t, i18n } = useTranslation(['auth', 'profile']);
  const isRtl = i18n.language === 'ar';

  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState<number>(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;
    setIsResending(true);
    setResendStatus('idle');
    setErrorMessage(null);
    try {
      if (onResendEmail) {
        await onResendEmail();
      }
      setResendStatus('success');
      setCooldown(60); // 60s cooldown to prevent spamming
    } catch (err: unknown) {
      setResendStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to resend verification email.');
    } finally {
      setIsResending(false);
    }
  };

  const handleLogoutAction = () => {
    if (onLogout) {
      onLogout();
    } else if (onBackToLogin) {
      onBackToLogin();
    }
  };

  return (
    <Card
      className="w-full max-w-lg mx-auto shadow-lg bg-surface border-border animate-in fade-in zoom-in-95 duration-200"
      dir={isRtl ? 'rtl' : 'ltr'}
      data-testid="verify-email-notice"
    >
      <CardHeader className="space-y-4 text-center pb-4">
        {/* Brand Lockup */}
        <div className="flex justify-center">
          <Logo size="md" showSubtitle={true} />
        </div>

        {/* Email Verification Icon Badge */}
        <div className="flex justify-center pt-2">
          <div className="w-16 h-16 rounded-full bg-university-light dark:bg-university-primary/20 flex items-center justify-center text-university-primary dark:text-university-accent shadow-inner">
            <MailCheck className="h-8 w-8" />
          </div>
        </div>

        <div className="space-y-1.5">
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
            {t('verificationNotice.title')}
          </CardTitle>
          <CardDescription className="text-sm text-foreground-muted max-w-sm mx-auto">
            {t('verificationNotice.subtitle')}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Display registered email */}
        {email && (
          <div className="p-3.5 rounded-lg bg-surface-secondary border border-border text-center">
            <span className="text-xs text-foreground-muted block mb-1">
              {t('verificationNotice.sentTo')}
            </span>
            <span className="font-semibold text-foreground break-all text-sm tracking-wide">
              {email}
            </span>
          </div>
        )}

        {/* Instructions */}
        <p className="text-sm text-foreground-muted text-center leading-relaxed">
          {t('verificationNotice.instructions')}
        </p>

        {/* Resend status alert */}
        {resendStatus === 'success' && (
          <div className="flex items-center gap-2 p-3 text-xs rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 animate-in fade-in duration-150">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            <span>{t('verificationNotice.resendSuccess')}</span>
          </div>
        )}

        {resendStatus === 'error' && (
          <div className="flex items-center gap-2 p-3 text-xs rounded-md bg-destructive-light dark:bg-destructive/20 text-destructive border border-destructive/30 animate-in fade-in duration-150">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>
              {errorMessage || 'Failed to resend verification email. Please try again later.'}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3 pt-2">
          {/* Prominent Resend Verification Email Button */}
          {showResend && (
            <Button
              type="button"
              disabled={isResending || cooldown > 0}
              onClick={handleResend}
              className="w-full h-11 cursor-pointer bg-university-primary hover:bg-university-secondary text-white font-medium flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isResending ? (
                <RotateCw className="h-4 w-4 animate-spin" />
              ) : (
                <Send className={cn('h-4 w-4', isRtl && 'rotate-180')} />
              )}
              {isResending
                ? t('verificationNotice.resending')
                : cooldown > 0
                  ? t('verifyEmail.resendCooldown', { seconds: cooldown })
                  : t('verificationNotice.resend')}
            </Button>
          )}

          {/* Genuine Logout Button */}
          <Button
            type="button"
            variant="outline"
            onClick={handleLogoutAction}
            className="w-full h-11 cursor-pointer border-border bg-surface hover:bg-surface-hover text-foreground font-medium flex items-center justify-center gap-2 shadow-xs transition-all"
          >
            <LogOut className={cn('h-4 w-4 text-foreground-muted', isRtl && 'scale-x-[-1]')} />
            {t('profile:nav.logout')}
          </Button>
        </div>

        {/* Spam Notice */}
        <div className="pt-2 border-t border-border text-center">
          <p className="text-xs text-foreground-muted italic leading-normal">
            {t('verificationNotice.spamNotice')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
