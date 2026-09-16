import React, { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Eye, EyeOff, KeyRound, RotateCw } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store';
import { changePassword } from '@/store/slices/profileSlice';
import { useToast } from '@/context/ToastContext';
import { createStrongPasswordSchema } from '@/lib/validations/auth';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';

export const ChangePasswordCard: React.FC = () => {
  const { t, i18n } = useTranslation(['profile', 'auth', 'common']);
  const isRtl = i18n.language === 'ar';
  const dispatch = useAppDispatch();
  const toast = useToast();

  const { profile, passwordStatus } = useAppSelector((state) => state.profile);
  const isLoading = passwordStatus === 'loading';
  const hasPassword = profile?.has_password !== false;

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordSchema = React.useMemo(() => {
    if (hasPassword) {
      return z
        .object({
          current_password: z
            .string()
            .min(1, t('profile.errors.currentPasswordRequired', 'Current password is required')),
          new_password: createStrongPasswordSchema(t, 'profile'),
          new_password_confirmation: z
            .string()
            .min(
              1,
              t('profile.errors.confirmPasswordRequired', 'Please confirm your new password')
            ),
        })
        .refine((data) => data.new_password === data.new_password_confirmation, {
          message: t('profile.errors.passwordMismatch', 'Passwords do not match'),
          path: ['new_password_confirmation'],
        });
    }

    return z
      .object({
        current_password: z.string().optional(),
        new_password: createStrongPasswordSchema(t, 'profile'),
        new_password_confirmation: z
          .string()
          .min(1, t('profile.errors.confirmPasswordRequired', 'Please confirm your new password')),
      })
      .refine((data) => data.new_password === data.new_password_confirmation, {
        message: t('profile.errors.passwordMismatch', 'Passwords do not match'),
        path: ['new_password_confirmation'],
      });
  }, [t, hasPassword]);

  type ChangePasswordFormValues = z.infer<typeof passwordSchema>;

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    clearErrors,
    trigger,
    formState: { errors, isSubmitted },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      current_password: '',
      new_password: '',
      new_password_confirmation: '',
    },
  });

  // Re-trigger validation on language change if the form has already been submitted
  React.useEffect(() => {
    if (isSubmitted) {
      trigger();
    }
  }, [i18n.language, isSubmitted, trigger]);

  const watchedNewPassword = useWatch({
    control,
    name: 'new_password',
    defaultValue: '',
  });

  const onSubmit = async (values: ChangePasswordFormValues) => {
    const payload: {
      new_password: string;
      new_password_confirmation: string;
      current_password?: string;
    } = {
      new_password: values.new_password,
      new_password_confirmation: values.new_password_confirmation,
    };

    if (hasPassword && values.current_password) {
      payload.current_password = values.current_password;
    }

    const resultAction = await dispatch(changePassword(payload));

    if (changePassword.fulfilled.match(resultAction)) {
      const msg =
        resultAction.payload.message ||
        (hasPassword
          ? t('profile.changePasswordSuccess', 'Password updated successfully!')
          : t('profile.setPasswordSuccess', 'Password created successfully!'));
      toast.success(msg);
      reset();
    } else if (changePassword.rejected.match(resultAction)) {
      const errorPayload = resultAction.payload;
      if (errorPayload?.errors) {
        Object.entries(errorPayload.errors).forEach(([field, messages]) => {
          if (messages && messages.length > 0) {
            setError(field as keyof ChangePasswordFormValues, {
              type: 'server',
              message: messages[0],
            });
          }
        });
      } else {
        const errorMsg =
          errorPayload?.message ||
          t('common:toast.error', 'Something went wrong. Please try again.');
        toast.error(errorMsg);
      }
    }
  };

  return (
    <Card className="shadow-xs bg-surface border-border" dir={isRtl ? 'rtl' : 'ltr'}>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-university-primary/10 flex items-center justify-center text-university-primary">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold text-foreground">
              {hasPassword ? t('profile.changePassword') : t('profile.setPassword')}
            </CardTitle>
            <CardDescription className="text-xs text-foreground-muted">
              {hasPassword
                ? t('profile.newPasswordPlaceholder', 'At least 8 characters')
                : t('profile.setPasswordSubtitle')}
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Current Password (only shown if user already has a password) */}
          {hasPassword && (
            <div>
              <Label
                htmlFor="current_password"
                className="text-sm font-medium text-foreground"
                required
              >
                {t('profile.currentPassword')}
              </Label>
              <div className="relative mt-1">
                <Lock
                  className={`absolute top-3 h-4 w-4 text-foreground-muted pointer-events-none ${
                    isRtl ? 'right-3' : 'left-3'
                  }`}
                />
                <Input
                  id="current_password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  dir="ltr"
                  placeholder={t('profile.currentPasswordPlaceholder')}
                  disabled={isLoading}
                  aria-invalid={!!errors.current_password}
                  className={`${isRtl ? 'pr-9 pl-10 text-right' : 'pl-9 pr-10 text-left'} h-10`}
                  {...register('current_password', {
                    onChange: () => {
                      if (errors.current_password) clearErrors('current_password');
                    },
                  })}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                  className={`absolute top-0 h-full px-3 flex items-center cursor-pointer text-foreground-muted hover:text-foreground transition-colors ${
                    isRtl ? 'left-0' : 'right-0'
                  }`}
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.current_password && (
                <p className="text-xs text-destructive font-medium mt-1">
                  {errors.current_password.message}
                </p>
              )}
            </div>
          )}

          {/* New Password */}
          <div>
            <Label htmlFor="new_password" className="text-sm font-medium text-foreground" required>
              {t('profile.newPassword')}
            </Label>
            <div className="relative mt-1">
              <Lock
                className={`absolute top-3 h-4 w-4 text-foreground-muted pointer-events-none ${
                  isRtl ? 'right-3' : 'left-3'
                }`}
              />
              <Input
                id="new_password"
                type={showNewPassword ? 'text' : 'password'}
                dir="ltr"
                placeholder={t('profile.newPasswordPlaceholder')}
                disabled={isLoading}
                aria-invalid={!!errors.new_password}
                className={`${isRtl ? 'pr-9 pl-10 text-right' : 'pl-9 pr-10 text-left'} h-10`}
                {...register('new_password', {
                  onChange: () => {
                    if (errors.new_password) clearErrors('new_password');
                  },
                })}
              />
              <button
                type="button"
                tabIndex={-1}
                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                className={`absolute top-0 h-full px-3 flex items-center cursor-pointer text-foreground-muted hover:text-foreground transition-colors ${
                  isRtl ? 'left-0' : 'right-0'
                }`}
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.new_password && (
              <p className="text-xs text-destructive font-medium mt-1">
                {errors.new_password.message}
              </p>
            )}
            <PasswordStrengthMeter password={watchedNewPassword} />
          </div>

          {/* Confirm New Password */}
          <div>
            <Label
              htmlFor="new_password_confirmation"
              className="text-sm font-medium text-foreground"
              required
            >
              {t('profile.confirmNewPassword')}
            </Label>
            <div className="relative mt-1">
              <Lock
                className={`absolute top-3 h-4 w-4 text-foreground-muted pointer-events-none ${
                  isRtl ? 'right-3' : 'left-3'
                }`}
              />
              <Input
                id="new_password_confirmation"
                type={showConfirmPassword ? 'text' : 'password'}
                dir="ltr"
                placeholder={t('profile.confirmNewPasswordPlaceholder')}
                disabled={isLoading}
                aria-invalid={!!errors.new_password_confirmation}
                className={`${isRtl ? 'pr-9 pl-10 text-right' : 'pl-9 pr-10 text-left'} h-10`}
                {...register('new_password_confirmation', {
                  onChange: () => {
                    if (errors.new_password_confirmation) clearErrors('new_password_confirmation');
                  },
                })}
              />
              <button
                type="button"
                tabIndex={-1}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                className={`absolute top-0 h-full px-3 flex items-center cursor-pointer text-foreground-muted hover:text-foreground transition-colors ${
                  isRtl ? 'left-0' : 'right-0'
                }`}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.new_password_confirmation && (
              <p className="text-xs text-destructive font-medium mt-1">
                {errors.new_password_confirmation.message}
              </p>
            )}
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              disabled={isLoading}
              className="cursor-pointer bg-university-primary hover:bg-university-secondary text-white font-medium shadow-xs transition-all flex items-center gap-2"
            >
              {isLoading && <RotateCw className="h-4 w-4 animate-spin" />}
              {isLoading
                ? t('profile.changePasswordSubmitting')
                : hasPassword
                  ? t('profile.changePasswordSubmit')
                  : t('profile.setPasswordSubmit')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
