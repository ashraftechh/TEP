import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { MailCheck, ArrowLeft, ArrowRight, RotateCw } from 'lucide-react';

export interface ForgotPasswordNoticeProps {
  email?: string | null;
  onBackToLogin?: () => void;
  onResend?: () => void;
}

export function ForgotPasswordNotice({
  email,
  onBackToLogin,
  onResend,
}: ForgotPasswordNoticeProps) {
  const { t, i18n } = useTranslation('auth');
  const isRtl = i18n.language === 'ar';

  return (
    <Card
      className="w-full max-w-lg mx-auto shadow-lg bg-surface border-border animate-in fade-in zoom-in-95 duration-200"
      dir={isRtl ? 'rtl' : 'ltr'}
      data-testid="forgot-password-notice"
    >
      <CardHeader className="space-y-4 text-center pb-4">
        {/* Brand Lockup */}
        <div className="flex justify-center">
          <Logo size="md" showSubtitle={true} />
        </div>

        {/* Email Sent Icon Badge */}
        <div className="flex justify-center pt-2">
          <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-inner">
            <MailCheck className="h-8 w-8" />
          </div>
        </div>

        <div className="space-y-1.5">
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
            {t('forgotPassword.successTitle')}
          </CardTitle>
          <CardDescription className="text-sm text-foreground-muted max-w-sm mx-auto">
            {t('forgotPassword.successMessage')}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Display Submitted Email */}
        {email && (
          <div className="p-3.5 rounded-lg bg-surface-secondary border border-border text-center">
            <span className="text-xs text-foreground-muted block mb-1">
              {t('forgotPassword.sentTo')}
            </span>
            <span className="font-semibold text-foreground break-all text-sm tracking-wide">
              {email}
            </span>
          </div>
        )}

        {/* Instructions */}
        <p className="text-sm text-foreground-muted text-center leading-relaxed">
          {t('forgotPassword.instructions')}
        </p>

        {/* Actions */}
        <div className="space-y-3 pt-2">
          {/* Back to Login Button */}
          <Button
            type="button"
            onClick={onBackToLogin}
            className="w-full h-11 cursor-pointer bg-university-primary hover:bg-university-secondary text-white font-medium flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            {isRtl ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
            {t('forgotPassword.backToLogin')}
          </Button>

          {/* Resend / Try another email option */}
          {onResend && (
            <div className="text-center pt-1">
              <p className="text-xs text-foreground-muted">
                {t('forgotPassword.resendPrompt')}{' '}
                <button
                  type="button"
                  onClick={onResend}
                  className="text-university-primary font-medium hover:underline focus:outline-none cursor-pointer inline-flex items-center gap-1"
                >
                  <RotateCw className="h-3 w-3" />
                  {t('forgotPassword.resend')}
                </button>
              </p>
            </div>
          )}
        </div>

        {/* Spam Notice */}
        <div className="pt-2 border-t border-border text-center">
          <p className="text-xs text-foreground-muted italic leading-normal">
            {t('forgotPassword.checkSpam')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
