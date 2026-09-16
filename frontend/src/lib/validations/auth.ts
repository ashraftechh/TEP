import { z } from 'zod';
import type { TFunction } from 'i18next';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

// Common disposable email domains to filter client-side (aligning with backend indisposable rule)
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com',
  'tempmail.com',
  '10minutemail.com',
  'guerrillamail.com',
  'sharklasers.com',
  'yopmail.com',
  'dispostable.com',
  'trashmail.com',
  'throwawaymail.com',
  'getairmail.com',
  'temp-mail.org',
  'fakeinbox.com',
  'mohmal.com',
  'emailondeck.com',
  'crazymailing.com',
  'maildrop.cc',
  'generator.email',
  'inboxbear.com',
]);

export const isDisposableEmail = (email: string): boolean => {
  const parts = email.trim().toLowerCase().split('@');
  if (parts.length !== 2) return false;
  return DISPOSABLE_EMAIL_DOMAINS.has(parts[1]);
};

export const isValidYemenPhone = (phone?: string): boolean => {
  if (!phone || phone.trim() === '') return true; // Optional field
  const parsed = parsePhoneNumberFromString(phone.trim(), 'YE');
  return parsed ? parsed.isValid() : false;
};

export interface PasswordCriteriaResult {
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSymbol: boolean;
  score: number; // 0 to 5
}

export const checkPasswordCriteria = (password: string): PasswordCriteriaResult => {
  const p = password || '';
  const hasMinLength = p.length >= 8;
  const hasUppercase = /[A-Z]/.test(p);
  const hasLowercase = /[a-z]/.test(p);
  const hasNumber = /[0-9]/.test(p);
  const hasSymbol = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(p);

  const score = [hasMinLength, hasUppercase, hasLowercase, hasNumber, hasSymbol].filter(
    Boolean
  ).length;

  return {
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSymbol,
    score,
  };
};

export const createStrongPasswordSchema = (
  t: TFunction,
  contextPrefix: 'register' | 'resetPassword' | 'profile' = 'register'
) => {
  const requiredKey = `${contextPrefix}.errors.passwordRequired`;
  const minKey = `${contextPrefix}.errors.passwordMin`;

  return z
    .string()
    .min(1, t(requiredKey, 'Password is required'))
    .min(8, t(minKey, 'Password must be at least 8 characters'))
    .refine((val) => /[A-Z]/.test(val), {
      message: t(
        'auth:passwordRules.uppercase',
        'Password must contain at least one uppercase letter (A-Z)'
      ),
    })
    .refine((val) => /[a-z]/.test(val), {
      message: t(
        'auth:passwordRules.lowercase',
        'Password must contain at least one lowercase letter (a-z)'
      ),
    })
    .refine((val) => /[0-9]/.test(val), {
      message: t('auth:passwordRules.number', 'Password must contain at least one number (0-9)'),
    })
    .refine((val) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(val), {
      message: t(
        'auth:passwordRules.symbol',
        'Password must contain at least one special character (!@#$%^&*...)'
      ),
    });
};

export const createRegisterSchema = (t: TFunction) => {
  return z
    .object({
      name: z
        .string()
        .min(1, t('register.errors.nameRequired', 'Full name is required'))
        .min(3, t('register.errors.nameMin', 'Full name must be at least 3 characters'))
        .max(255, t('register.errors.nameMax', 'Name cannot exceed 255 characters')),
      email: z
        .string()
        .min(1, t('register.errors.emailRequired', 'Email is required'))
        .max(255, t('register.errors.emailMax', 'Email cannot exceed 255 characters'))
        .email(t('register.errors.emailInvalid', 'Please enter a valid email address'))
        .refine((val) => !isDisposableEmail(val), {
          message: t(
            'register.errors.emailDisposable',
            'Disposable email addresses are not allowed'
          ),
        }),
      phone: z
        .string()
        .optional()
        .refine((val) => isValidYemenPhone(val), {
          message: t('register.errors.phoneInvalid', 'Please enter a valid phone number'),
        }),
      password: createStrongPasswordSchema(t, 'register'),
      password_confirmation: z
        .string()
        .min(1, t('register.errors.passwordConfirmationRequired', 'Please confirm your password')),
      account_type: z.literal('student'),
      major_id: z
        .string({
          required_error: t('register.errors.majorRequired', 'Please select your academic major'),
        })
        .min(1, t('register.errors.majorRequired', 'Please select your academic major')),
    })
    .superRefine((data, ctx) => {
      if (data.password !== data.password_confirmation) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('register.errors.passwordConfirmationMismatch', 'Passwords do not match'),
          path: ['password_confirmation'],
        });
      }
    });
};

export type RegisterFormValues = {
  name: string;
  email: string;
  phone?: string;
  password: string;
  password_confirmation: string;
  account_type: 'student';
  major_id: string;
};

export const createLoginSchema = (t: TFunction) =>
  z.object({
    email: z
      .string()
      .min(1, t('login.errors.emailRequired', 'Email is required'))
      .email(t('login.errors.emailInvalid', 'Please enter a valid email address')),
    password: z.string().min(1, t('login.errors.passwordRequired', 'Password is required')),
    remember: z.boolean().optional(),
  });

export type LoginSchema = ReturnType<typeof createLoginSchema>;
export type LoginFormValues = z.infer<LoginSchema>;

export const createForgotPasswordSchema = (t: TFunction) => {
  return z.object({
    email: z
      .string()
      .min(1, t('forgotPassword.errors.emailRequired', 'Email is required'))
      .email(t('forgotPassword.errors.emailInvalid', 'Please enter a valid email address')),
  });
};

export type ForgotPasswordFormValues = {
  email: string;
};

export const createResetPasswordSchema = (t: TFunction) => {
  return z
    .object({
      token: z.string().min(1, t('resetPassword.errors.tokenRequired', 'Reset token is required')),
      email: z
        .string()
        .min(1, t('resetPassword.errors.emailRequired', 'Email is required'))
        .email(t('resetPassword.errors.emailInvalid', 'Please enter a valid email address')),
      password: createStrongPasswordSchema(t, 'resetPassword'),
      password_confirmation: z
        .string()
        .min(
          1,
          t('resetPassword.errors.passwordConfirmationRequired', 'Please confirm your new password')
        ),
    })
    .superRefine((data, ctx) => {
      if (data.password !== data.password_confirmation) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t('resetPassword.errors.passwordMismatch', 'Passwords do not match'),
          path: ['password_confirmation'],
        });
      }
    });
};

export type ResetPasswordFormValues = {
  token: string;
  email: string;
  password: string;
  password_confirmation: string;
};

export const createCompleteRegistrationSchema = (t: TFunction) => {
  return z.object({
    account_type: z.literal('student'),
    major_id: z
      .string({
        required_error: t('register.errors.majorRequired', 'Please select your academic major'),
      })
      .min(1, t('register.errors.majorRequired', 'Please select your academic major')),
  });
};

export type CompleteRegistrationFormValues = {
  account_type: 'student';
  major_id: string;
};
