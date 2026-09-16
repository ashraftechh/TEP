import { useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Logo } from '@/components/Logo';
import { localizeAuthError } from '@/lib/localizeError';
import {
  Building2,
  Mail,
  Phone,
  Globe,
  Hash,
  Layers,
  FileText,
  AlertCircle,
  Loader2,
  Send,
} from 'lucide-react';
import { Link } from 'react-router';
import {
  createCompanyRegistrationRequestSchema,
  type CompanyRegistrationRequestFormValues,
} from '@/lib/validations/company';
import { useAppDispatch, useAppSelector } from '@/store';
import { submitCompanyRegistrationRequest } from '@/store/slices/companySlice';
import { cn } from '@/lib/utils';
import type { IndustryItem } from '@/store/slices/lookupSlice';

const getLocalizedName = (
  name: string | { ar?: string; en?: string; [key: string]: string | undefined } | undefined,
  lang: string
): string => {
  if (!name) return '';
  if (typeof name === 'string') return name;
  return name[lang] ?? name['en'] ?? name['ar'] ?? Object.values(name)[0] ?? '';
};

interface RegisterCompanyFormProps {
  industries: IndustryItem[];
  isLoadingIndustries: boolean;
  onSwitchToLogin?: () => void;
}

export function RegisterCompanyForm({
  industries,
  isLoadingIndustries,
  onSwitchToLogin,
}: RegisterCompanyFormProps) {
  const { t, i18n } = useTranslation(['companies', 'auth', 'common']);
  const lang = i18n.language || 'ar';
  const isRtl = lang === 'ar';
  const dispatch = useAppDispatch();

  const { status, error, validationErrors } = useAppSelector((state) => state.company);
  const isLoading = status === 'loading';

  const schema = useMemo(() => createCompanyRegistrationRequestSchema(t), [t]);

  const {
    register,
    handleSubmit,
    control,
    setError,
    clearErrors,
    trigger,
    formState: { errors, isSubmitted },
  } = useForm<CompanyRegistrationRequestFormValues>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      industry_id: null,
      registration_number: '',
      website: '',
      description: '',
    },
  });

  // Re-trigger validation on language change if the form has already been submitted
  useEffect(() => {
    if (isSubmitted) {
      trigger();
    }
  }, [i18n.language, isSubmitted, trigger]);

  // Map server-side validation errors to react-hook-form fields
  useEffect(() => {
    if (!validationErrors) return;
    const fieldMap: Record<string, keyof CompanyRegistrationRequestFormValues> = {
      name: 'name',
      email: 'email',
      contact_email: 'email',
      phone: 'phone',
      industry_id: 'industry_id',
      registration_number: 'registration_number',
      website: 'website',
      description: 'description',
    };
    Object.entries(validationErrors).forEach(([field, messages]) => {
      const formField = fieldMap[field];
      if (formField && messages && messages.length > 0) {
        const localizedMsg = localizeAuthError(messages[0], t) || messages[0];
        setError(formField, { type: 'server', message: localizedMsg });
      }
    });
  }, [validationErrors, setError, t]);

  const getFieldError = (field: keyof CompanyRegistrationRequestFormValues): string | undefined => {
    if (errors[field]?.message) return errors[field]?.message;
    // The backend returns duplicate-email errors under 'contact_email', map it to the 'email' field
    const serverKeys: string[] = field === 'email' ? [field, 'contact_email'] : [field];
    for (const key of serverKeys) {
      const serverErr = validationErrors?.[key];
      if (serverErr && serverErr.length > 0) {
        return localizeAuthError(serverErr[0], t) || serverErr[0];
      }
    }
    return undefined;
  };

  const onSubmit = async (values: CompanyRegistrationRequestFormValues) => {
    const resultAction = await dispatch(
      submitCompanyRegistrationRequest({
        name: values.name,
        email: values.email,
        phone: values.phone || undefined,
        industry_id: values.industry_id ?? undefined,
        registration_number: values.registration_number || undefined,
        website: values.website || undefined,
        description: values.description || undefined,
      })
    );

    if (submitCompanyRegistrationRequest.rejected.match(resultAction)) {
      const errPayload = resultAction.payload;
      const serverErrs = errPayload?.errors;
      if (serverErrs && Object.keys(serverErrs).length > 0) {
        const fieldMap: Record<string, keyof CompanyRegistrationRequestFormValues> = {
          name: 'name',
          email: 'email',
          contact_email: 'email',
          phone: 'phone',
          industry_id: 'industry_id',
          registration_number: 'registration_number',
          website: 'website',
          description: 'description',
        };
        Object.entries(serverErrs).forEach(([f, messages]) => {
          const formField = fieldMap[f];
          if (formField && messages && messages.length > 0) {
            const localizedMsg = localizeAuthError(messages[0], t) || messages[0];
            setError(formField, { type: 'server', message: localizedMsg });
          }
        });
      }
    }
  };

  const serverError = localizeAuthError(error, t);

  const nameError = getFieldError('name');
  const emailError = getFieldError('email');
  const phoneError = getFieldError('phone');
  const industryError = getFieldError('industry_id');
  const regNumberError = getFieldError('registration_number');
  const websiteError = getFieldError('website');
  const descError = getFieldError('description');

  return (
    <Card className="w-full shadow-sm border border-border bg-surface">
      <CardHeader className="space-y-4 pb-6 text-center">
        {/* Logo */}
        <div className="flex justify-center">
          <Logo size="md" />
        </div>

        <div>
          <CardTitle className="text-2xl font-bold text-foreground">
            {t('companies:companyRequest.title')}
          </CardTitle>
          <CardDescription className="text-foreground-muted mt-1">
            {t('companies:companyRequest.subtitle')}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          {/* Top-level server error (only when not a specific field validation error) */}
          {serverError && !validationErrors && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          {/* Company Name */}
          <div className="space-y-1.5">
            <Label htmlFor="company-name" className="text-foreground font-medium">
              {t('companies:companyRequest.companyName')}{' '}
              <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Building2
                className={cn(
                  'absolute top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted pointer-events-none',
                  isRtl ? 'right-3' : 'left-3'
                )}
              />
              <Input
                id="company-name"
                type="text"
                autoComplete="organization"
                placeholder={t('companies:companyRequest.companyNamePlaceholder')}
                aria-invalid={!!nameError}
                className={cn(
                  'bg-surface border-border-input',
                  isRtl ? 'pr-10' : 'pl-10',
                  nameError && 'border-destructive'
                )}
                {...register('name', {
                  onChange: () => {
                    if (nameError) clearErrors('name');
                  },
                })}
              />
            </div>
            {nameError && <p className="text-xs text-destructive font-medium mt-1">{nameError}</p>}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="company-email" className="text-foreground font-medium">
              {t('companies:companyRequest.email')} <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <Mail
                className={cn(
                  'absolute top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted pointer-events-none',
                  isRtl ? 'right-3' : 'left-3'
                )}
              />
              <Input
                id="company-email"
                type="email"
                autoComplete="email"
                dir="ltr"
                placeholder={t('companies:companyRequest.emailPlaceholder')}
                aria-invalid={!!emailError}
                className={cn(
                  'bg-surface border-border-input',
                  isRtl ? 'pr-10 text-right' : 'pl-10',
                  emailError && 'border-destructive'
                )}
                {...register('email', {
                  onChange: () => {
                    if (emailError) clearErrors('email');
                  },
                })}
              />
            </div>
            {emailError && (
              <p className="text-xs text-destructive font-medium mt-1">{emailError}</p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="company-phone" className="text-foreground font-medium">
              {t('companies:companyRequest.phone')}
            </Label>
            <div className="relative">
              <Phone
                className={cn(
                  'absolute top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted pointer-events-none',
                  isRtl ? 'right-3' : 'left-3'
                )}
              />
              <Input
                id="company-phone"
                type="tel"
                autoComplete="tel"
                dir="ltr"
                placeholder={t('companies:companyRequest.phonePlaceholder')}
                aria-invalid={!!phoneError}
                className={cn(
                  'bg-surface border-border-input',
                  isRtl ? 'pr-10 text-right' : 'pl-10',
                  phoneError && 'border-destructive'
                )}
                {...register('phone', {
                  onChange: () => {
                    if (phoneError) clearErrors('phone');
                  },
                })}
              />
            </div>
            {phoneError && (
              <p className="text-xs text-destructive font-medium mt-1">{phoneError}</p>
            )}
          </div>

          {/* Industry */}
          <div className="space-y-1.5">
            <Label htmlFor="company-industry" className="text-foreground font-medium">
              {t('companies:companyRequest.industry')}
            </Label>
            <div className="relative">
              <Layers
                className={cn(
                  'absolute top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted pointer-events-none z-10',
                  isRtl ? 'right-3' : 'left-3'
                )}
              />
              <Controller
                name="industry_id"
                control={control}
                render={({ field }) => {
                  const selectedIndustry = industries.find(
                    (ind) => String(ind.id) === String(field.value)
                  );
                  return (
                    <Select
                      disabled={isLoadingIndustries}
                      value={field.value ? String(field.value) : ''}
                      onValueChange={(val) => {
                        field.onChange(val ? parseInt(val) : null);
                        if (industryError) clearErrors('industry_id');
                      }}
                    >
                      <SelectTrigger
                        id="company-industry"
                        aria-invalid={!!industryError}
                        className={cn(
                          'w-full bg-surface border-border-input cursor-pointer',
                          isRtl ? 'pr-10 text-right' : 'pl-10 text-left',
                          industryError && 'border-destructive'
                        )}
                      >
                        <SelectValue
                          placeholder={
                            isLoadingIndustries
                              ? t('common:loading', 'Loading...')
                              : t('companies:companyRequest.selectIndustry')
                          }
                        >
                          {selectedIndustry
                            ? getLocalizedName(selectedIndustry.name, lang)
                            : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {industries.map((industry) => (
                          <SelectItem
                            key={industry.id}
                            value={String(industry.id)}
                            className="cursor-pointer"
                          >
                            {getLocalizedName(industry.name, lang)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  );
                }}
              />
            </div>
            {industryError && (
              <p className="text-xs text-destructive font-medium mt-1">{industryError}</p>
            )}
          </div>

          {/* Registration Number */}
          <div className="space-y-1.5">
            <Label htmlFor="company-reg-number" className="text-foreground font-medium">
              {t('companies:companyRequest.registrationNumber')}
            </Label>
            <div className="relative">
              <Hash
                className={cn(
                  'absolute top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted pointer-events-none',
                  isRtl ? 'right-3' : 'left-3'
                )}
              />
              <Input
                id="company-reg-number"
                type="text"
                dir="ltr"
                placeholder={t('companies:companyRequest.registrationNumberPlaceholder')}
                aria-invalid={!!regNumberError}
                className={cn(
                  'bg-surface border-border-input',
                  isRtl ? 'pr-10 text-right' : 'pl-10',
                  regNumberError && 'border-destructive'
                )}
                {...register('registration_number', {
                  onChange: () => {
                    if (regNumberError) clearErrors('registration_number');
                  },
                })}
              />
            </div>
            {regNumberError && (
              <p className="text-xs text-destructive font-medium mt-1">{regNumberError}</p>
            )}
          </div>

          {/* Website */}
          <div className="space-y-1.5">
            <Label htmlFor="company-website" className="text-foreground font-medium">
              {t('companies:companyRequest.website')}
            </Label>
            <div className="relative">
              <Globe
                className={cn(
                  'absolute top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-muted pointer-events-none',
                  isRtl ? 'right-3' : 'left-3'
                )}
              />
              <Input
                id="company-website"
                type="url"
                dir="ltr"
                placeholder={t('companies:companyRequest.websitePlaceholder')}
                aria-invalid={!!websiteError}
                className={cn(
                  'bg-surface border-border-input',
                  isRtl ? 'pr-10 text-right' : 'pl-10',
                  websiteError && 'border-destructive'
                )}
                {...register('website', {
                  onChange: () => {
                    if (websiteError) clearErrors('website');
                  },
                })}
              />
            </div>
            {websiteError && (
              <p className="text-xs text-destructive font-medium mt-1">{websiteError}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="company-description" className="text-foreground font-medium">
              {t('companies:companyRequest.description')}
            </Label>
            <div className="relative">
              <FileText
                className={cn(
                  'absolute top-3 h-4 w-4 text-foreground-muted pointer-events-none',
                  isRtl ? 'right-3' : 'left-3'
                )}
              />
              <Textarea
                id="company-description"
                rows={4}
                placeholder={t('companies:companyRequest.descriptionPlaceholder')}
                aria-invalid={!!descError}
                className={cn(
                  'bg-surface border-border-input resize-none',
                  isRtl ? 'pr-10' : 'pl-10',
                  descError && 'border-destructive'
                )}
                {...register('description', {
                  onChange: () => {
                    if (descError) clearErrors('description');
                  },
                })}
              />
            </div>
            {descError && <p className="text-xs text-destructive font-medium mt-1">{descError}</p>}
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 bg-university-primary hover:bg-university-secondary text-white font-semibold cursor-pointer transition-colors disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className={cn('h-4 w-4', isRtl && 'rotate-180')} />
            )}
            <span>
              {isLoading
                ? t('companies:companyRequest.submitting')
                : t('companies:companyRequest.submit')}
            </span>
          </Button>
        </form>

        {/* Link back to login */}
        <div className="pt-1 text-center">
          <p className="text-sm text-foreground-muted">
            {t('companies:companyRequest.loginLink')}{' '}
            <Link
              to="/login"
              onClick={onSwitchToLogin}
              className="text-university-primary font-medium hover:underline cursor-pointer"
            >
              {t('companies:companyRequest.loginLinkAction')}
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
