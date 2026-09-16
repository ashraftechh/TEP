import { z } from 'zod';
import type { TFunction } from 'i18next';
import { isValidYemenPhone } from '@/lib/validations/auth';

export const createProfileSchema = (t: TFunction) => {
  return z.object({
    name: z
      .string()
      .min(1, t('profile:profile.errors.nameRequired', 'Full name is required'))
      .min(3, t('profile:profile.errors.nameMin', 'Full name must be at least 3 characters'))
      .max(255, t('profile:profile.errors.nameMax', 'Full name cannot exceed 255 characters')),
    phone: z
      .string()
      .optional()
      .refine((val) => isValidYemenPhone(val), {
        message: t('profile:profile.errors.phoneInvalid', 'Invalid phone number'),
      }),
    job_title: z
      .string()
      .max(255, t('profile:profile.errors.jobTitleMax', 'Job title cannot exceed 255 characters'))
      .optional(),
    bio: z
      .string()
      .max(1000, t('profile:profile.errors.bioMax', 'Bio cannot exceed 1000 characters'))
      .optional(),
    address: z
      .string()
      .max(255, t('profile:profile.errors.addressMax', 'Address cannot exceed 255 characters'))
      .optional(),
    expected_graduation: z.string().optional(),
  });
};

export type ProfileFormValues = z.infer<ReturnType<typeof createProfileSchema>>;
