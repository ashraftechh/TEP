import React from 'react';
import { Link } from 'react-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Logo } from '@/components/Logo';
import { localizeAuthError } from '@/lib/localizeError';
import { Layers, AlertCircle, RotateCw, UserCheck, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

import {
  createCompleteRegistrationSchema,
  type CompleteRegistrationFormValues,
} from '@/lib/validations/auth';
import type { User as AuthUser } from '@/store/slices/authSlice';
import type { OptionItem } from './RegisterForm';

export interface CompleteRegistrationFormProps {
  user: AuthUser | null;
  onSubmit?: (data: CompleteRegistrationFormValues) => Promise<void> | void;
  majors?: OptionItem[];
  isLoadingLookups?: boolean;
  isLoading?: boolean;
  errorMessage?: string | null;
  serverValidationErrors?: Record<string, string[]> | null;
}

export function CompleteRegistrationForm({
  user,
  onSubmit,
  majors = [],
  isLoadingLookups = false,
  isLoading = false,
  errorMessage = null,
  serverValidationErrors = null,
}: CompleteRegistrationFormProps) {
  const { t, i18n } = useTranslation(['auth', 'companies']);
  const isRtl = i18n.language === 'ar';

  const schema = React.useMemo(() => createCompleteRegistrationSchema(t), [t]);

  const {
    handleSubmit,
    control,
    setError,
    clearErrors,
    trigger,
    formState: { errors, isSubmitted },
  } = useForm<CompleteRegistrationFormValues>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      account_type: 'student',
      major_id: '',
    },
  });

  // Apply server-side 422 validation errors to corresponding form fields
  React.useEffect(() => {
    if (serverValidationErrors) {
      Object.entries(serverValidationErrors).forEach(([field, messages]) => {
        if (messages && messages.length > 0) {
          const localizedMsg = localizeAuthError(messages[0], t) || messages[0];
          setError(field as keyof CompleteRegistrationFormValues, {
            type: 'server',
            message: localizedMsg,
          });
        }
      });
    }
  }, [serverValidationErrors, setError, t]);

  // Re-trigger validation on language change if the form has already been submitted
  React.useEffect(() => {
    if (isSubmitted) {
      trigger();
    }
  }, [i18n.language, isSubmitted, trigger]);

  const getOptionLabel = (optionName?: OptionItem['name']): string => {
    if (!optionName) return '';
    if (typeof optionName === 'string') return optionName;
    return (isRtl ? optionName.ar : optionName.en) || optionName.en || optionName.ar || '';
  };

  const handleFormSubmit = async (values: CompleteRegistrationFormValues) => {
    if (onSubmit) {
      await onSubmit(values);
    }
  };

  return (
    <Card
      className="w-full max-w-lg mx-auto shadow-lg bg-surface border-border animate-in fade-in zoom-in-95 duration-200"
      dir={isRtl ? 'rtl' : 'ltr'}
      data-testid="complete-registration-form"
    >
      <CardHeader className="space-y-3 text-center pb-4">
        <div className="flex justify-center">
          <Logo size="md" />
        </div>
        <div className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
            {t('completeRegistration.title')}
          </CardTitle>
          <CardDescription className="text-sm text-foreground-muted">
            {t('completeRegistration.subtitle')}
          </CardDescription>
        </div>

        {/* Authenticated SSO User Info Banner */}
        {user && (
          <div className="mt-2 p-3 rounded-lg bg-surface-secondary border border-border flex items-center justify-between text-start gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-university-primary/10 text-university-primary flex items-center justify-center flex-shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">
                  {t('completeRegistration.greeting', { name: user.name })}
                </p>
                <p className="text-xs text-foreground-muted truncate">{user.email}</p>
              </div>
            </div>
            <div className="flex-shrink-0 flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
              <ShieldCheck className="w-3 h-3" />
              <span>{t('completeRegistration.ssoBadge')}</span>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Error Alert */}
        {errorMessage && (
          <div
            className="flex items-center gap-2 p-3 text-sm rounded-md bg-destructive-light dark:bg-destructive/20 text-destructive border border-destructive/30 animate-in fade-in duration-150"
            role="alert"
          >
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{localizeAuthError(errorMessage, t) || errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4.5" noValidate>
          {/* Student Academic Major */}
          <div>
            <Label htmlFor="major_id" className="font-semibold text-foreground" required>
              {t('register.major')}
            </Label>
            <div className="relative mt-1">
              <Controller
                control={control}
                name="major_id"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(val) => {
                      field.onChange(val);
                      if (errors.major_id) clearErrors('major_id');
                    }}
                  >
                    <SelectTrigger
                      id="major_id"
                      aria-invalid={!!errors.major_id}
                      className={`cursor-pointer ${isRtl ? 'pr-9 pl-3' : 'pl-9 pr-3'}`}
                    >
                      <SelectValue placeholder={t('register.selectMajor')}>
                        {field.value
                          ? getOptionLabel(
                              majors.find((m) => String(m.id) === String(field.value))?.name
                            )
                          : undefined}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {majors.length > 0 ? (
                        majors.map((major) => (
                          <SelectItem
                            key={major.id}
                            value={String(major.id)}
                            className="cursor-pointer"
                          >
                            {getOptionLabel(major.name)}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="" disabled>
                          {isLoadingLookups ? '...' : t('register.selectMajor')}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
              <Layers
                className={`absolute top-2.5 h-4 w-4 text-foreground-muted pointer-events-none ${
                  isRtl ? 'right-3' : 'left-3'
                }`}
              />
            </div>
            {errors.major_id && (
              <p className="text-xs text-destructive font-medium mt-1">{errors.major_id.message}</p>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 cursor-pointer bg-university-primary hover:bg-university-secondary text-white font-medium flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <RotateCw className="h-4 w-4 animate-spin" />
                  <span>{t('completeRegistration.submitting')}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className={cn('h-4 w-4', isRtl && 'scale-x-[-1]')} />
                  <span>{t('completeRegistration.submit')}</span>
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Company Registration Request Link */}
        <div className="pt-1 text-center">
          <p className="text-sm text-foreground-muted">
            {t('companies:companyRequest.requestCompanyLink')}{' '}
            <Link
              to="/register-company"
              className="text-university-primary font-medium hover:underline cursor-pointer"
            >
              {t('companies:companyRequest.requestCompanyLinkAction')}
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default CompleteRegistrationForm;
