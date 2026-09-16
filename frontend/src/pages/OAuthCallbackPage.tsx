import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { RotateCw } from 'lucide-react';

export const OAuthCallbackPage: React.FC = () => {
  const { t } = useTranslation('auth');
  const [searchParams] = useSearchParams();
  const error = searchParams.get('error');

  useEffect(() => {
    // Notify parent window (opener) that SSO has completed
    if (window.opener) {
      window.opener.postMessage(
        {
          type: 'sso-complete',
          error: error || null,
        },
        window.location.origin
      );
      // Close popup window
      setTimeout(() => {
        window.close();
      }, 500);
    } else {
      // If opened directly (not in popup), redirect to dashboard/login
      window.location.href = error ? '/login' : '/dashboard';
    }
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface-secondary text-foreground p-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <RotateCw className="h-8 w-8 text-university-primary animate-spin" />
        <p className="text-sm font-medium text-foreground-muted">
          {error ? t('sso.processingError') : t('sso.completing')}
        </p>
      </div>
    </div>
  );
};

export default OAuthCallbackPage;
