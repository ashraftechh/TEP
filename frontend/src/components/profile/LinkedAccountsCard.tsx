import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link2, Unlink, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { type SsoIdentityData } from '@/types/profile';

interface LinkedAccountsCardProps {
  ssoIdentities?: SsoIdentityData[];
  hasPassword?: boolean;
  onUnlink: (provider: string) => void;
  isUnlinking?: boolean;
}

export const LinkedAccountsCard: React.FC<LinkedAccountsCardProps> = ({
  ssoIdentities = [],
  hasPassword = true,
  onUnlink,
  isUnlinking = false,
}) => {
  const { t } = useTranslation(['profile', 'auth']);

  const providers: Array<{
    id: 'google' | 'microsoft';
    name: string;
    renderIcon: () => React.ReactNode;
  }> = [
    {
      id: 'google',
      name: 'Google',
      renderIcon: () => (
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
      ),
    },
    {
      id: 'microsoft',
      name: 'Microsoft',
      renderIcon: () => (
        <svg className="w-5 h-5" viewBox="0 0 23 23">
          <path fill="#f35325" d="M1 1h10v10H1z" />
          <path fill="#81bc06" d="M12 1h10v10H12z" />
          <path fill="#05a6f0" d="M1 12h10v10H1z" />
          <path fill="#ffba08" d="M12 12h10v10H12z" />
        </svg>
      ),
    },
  ];

  const isOnlyAuthMethod = (providerId: string) => {
    if (hasPassword) return false;
    const connectedCount = ssoIdentities.length;
    return connectedCount <= 1 && ssoIdentities.some((i) => i.provider === providerId);
  };

  return (
    <Card className="bg-surface border-border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-bold text-foreground">
          <Link2 className="h-5 w-5 text-university-primary shrink-0" />
          <span>{t('profile.linkedAccounts')}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {providers.map((provider) => {
          const identity = ssoIdentities.find((i) => i.provider === provider.id);
          const isConnected = Boolean(identity);
          const cannotUnlink = isOnlyAuthMethod(provider.id);

          return (
            <div
              key={provider.id}
              className="p-3.5 rounded-xl border border-border bg-surface-secondary/40 space-y-2.5 transition-all"
            >
              {/* Provider Header */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-surface border border-border/80 flex items-center justify-center shadow-xs shrink-0">
                    {provider.renderIcon()}
                  </div>
                  <span className="font-semibold text-sm text-foreground truncate">
                    {provider.name}
                  </span>
                </div>

                {isConnected ? (
                  <Badge
                    variant="success"
                    className="text-[10px] py-0.5 px-2 flex items-center gap-1 shrink-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    {t('profile.connected')}
                  </Badge>
                ) : (
                  <Badge
                    variant="secondary"
                    className="text-[10px] py-0.5 px-2 shrink-0 font-normal text-foreground-muted"
                  >
                    {t('profile.notConnected')}
                  </Badge>
                )}
              </div>

              {/* Email info */}
              {isConnected && identity?.provider_email && (
                <p className="text-xs text-foreground-muted font-mono truncate px-0.5">
                  {identity.provider_email}
                </p>
              )}

              {/* Actions / Warnings */}
              {isConnected && (
                <div className="pt-1 border-t border-border/60">
                  {cannotUnlink ? (
                    <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs leading-relaxed">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                      <span>{t('profile.lastAuthMethodWarning')}</span>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isUnlinking}
                      onClick={() => onUnlink(provider.id)}
                      className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20 text-xs h-7.5 rounded-lg cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Unlink className="w-3.5 h-3.5" />
                      <span>{isUnlinking ? t('profile.unlinking') : t('profile.unlink')}</span>
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default LinkedAccountsCard;
