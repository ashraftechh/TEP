import { z } from 'zod';
import type { TFunction } from 'i18next';
import { isDisposableEmail, isValidYemenPhone } from '@/lib/validations/auth';

/**
 * Zod schema for the Company Registration Request form.
 * Client-side validation mirrors the backend FormRequest rules.
 */
export const createCompanyRegistrationRequestSchema = (t: TFunction) =>
  z.object({
    name: z
      .string({ required_error: t('companies:errors.nameRequired') })
      .min(1, t('companies:errors.nameRequired'))
      .min(3, t('companies:errors.nameMin', { defaultValue: 'Must be at least 3 characters' }))
      .max(255),

    email: z
      .string({ required_error: t('companies:errors.emailRequired') })
      .min(1, t('companies:errors.emailRequired'))
      .email(t('companies:errors.emailInvalid'))
      .max(255)
      .refine((email) => !isDisposableEmail(email), {
        message: t('companies:errors.emailDisposable'),
      }),

    phone: z
      .string()
      .optional()
      .refine((phone) => isValidYemenPhone(phone), {
        message: t('companies:errors.phoneInvalid'),
      }),

    industry_id: z.union([z.number().int().positive(), z.null()]).optional(),

    registration_number: z
      .string()
      .max(100, t('companies:errors.registrationNumberTooLong'))
      .optional(),

    website: z
      .string()
      .optional()
      .refine(
        (url) => {
          if (!url || url.trim() === '') return true;
          try {
            new URL(url);
            return true;
          } catch {
            return false;
          }
        },
        { message: t('companies:errors.websiteInvalid') }
      ),

    description: z.string().max(2000, t('companies:errors.descriptionTooLong')).optional(),
  });

export type CompanyRegistrationRequestFormValues = z.infer<
  ReturnType<typeof createCompanyRegistrationRequestSchema>
>;

/**
 * Zod schema for updating Company Profile.
 * Matches backend UpdateCompanyProfileRequest rules and mirrors ProfilePage pattern.
 */
export const createUpdateCompanyProfileSchema = (t: TFunction) =>
  z.object({
    name_ar: z
      .string()
      .min(1, t('companies:profile.errors.nameArRequired', 'Company name in Arabic is required'))
      .min(
        3,
        t(
          'companies:profile.errors.nameArMin',
          'Company name in Arabic must be at least 3 characters'
        )
      )
      .max(
        255,
        t(
          'companies:profile.errors.nameArMax',
          'Company name in Arabic cannot exceed 255 characters'
        )
      ),

    name_en: z
      .string()
      .min(1, t('companies:profile.errors.nameEnRequired', 'Company name in English is required'))
      .min(
        3,
        t(
          'companies:profile.errors.nameEnMin',
          'Company name in English must be at least 3 characters'
        )
      )
      .max(
        255,
        t(
          'companies:profile.errors.nameEnMax',
          'Company name in English cannot exceed 255 characters'
        )
      ),

    description_ar: z
      .string()
      .max(
        2000,
        t(
          'companies:profile.errors.descriptionArMax',
          'Description in Arabic cannot exceed 2000 characters'
        )
      )
      .optional(),

    description_en: z
      .string()
      .max(
        2000,
        t(
          'companies:profile.errors.descriptionEnMax',
          'Description in English cannot exceed 2000 characters'
        )
      )
      .optional(),

    industry_id: z.string().optional(),

    registration_number: z
      .string()
      .max(
        100,
        t(
          'companies:profile.errors.registrationNumberMax',
          'Commercial registration number cannot exceed 100 characters'
        )
      )
      .optional(),

    email: z
      .string()
      .max(
        255,
        t('companies:profile.errors.emailMax', 'Email address cannot exceed 255 characters')
      )
      .optional()
      .refine(
        (val) => {
          if (!val || val.trim() === '') return true;
          return z.string().email().safeParse(val).success;
        },
        { message: t('companies:profile.errors.emailInvalid', 'Invalid email address') }
      ),

    phone: z
      .string()
      .max(20, t('companies:profile.errors.phoneMax', 'Phone number cannot exceed 20 characters'))
      .optional()
      .refine(
        (val) => {
          if (!val || val.trim() === '') return true;
          return isValidYemenPhone(val);
        },
        { message: t('companies:profile.errors.phoneInvalid', 'Invalid phone number') }
      ),

    website: z
      .string()
      .max(
        255,
        t('companies:profile.errors.websiteMax', 'Website URL cannot exceed 255 characters')
      )
      .optional()
      .refine(
        (url) => {
          if (!url || url.trim() === '') return true;
          try {
            const parsed = new URL(url);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:';
          } catch {
            return false;
          }
        },
        { message: t('companies:profile.errors.websiteInvalid', 'Invalid website URL') }
      ),

    address: z
      .string()
      .max(255, t('companies:profile.errors.addressMax', 'Address cannot exceed 255 characters'))
      .optional(),

    city: z
      .string()
      .max(100, t('companies:profile.errors.cityMax', 'City cannot exceed 100 characters'))
      .optional(),

    established_year: z
      .string()
      .optional()
      .refine(
        (val) => {
          if (!val || val.trim() === '') return true;
          const num = Number(val);
          const currentYear = new Date().getFullYear();
          return !isNaN(num) && Number.isInteger(num) && num >= 1900 && num <= currentYear;
        },
        {
          message: t('companies:profile.errors.establishedYearInvalid', 'Invalid established year'),
        }
      ),

    employees_count: z
      .string()
      .max(
        20,
        t(
          'companies:profile.errors.employeesCountMax',
          'Employees count cannot exceed 20 characters'
        )
      )
      .optional(),
  });

export type UpdateCompanyProfileFormValues = z.infer<
  ReturnType<typeof createUpdateCompanyProfileSchema>
>;
