import { z } from 'zod';
import type { TFunction } from 'i18next';

export const createOpportunitySchema = (t: TFunction) => {
  return z
    .object({
      title_ar: z
        .string()
        .min(
          1,
          t('opportunities:form.errors.titleArRequired', 'Opportunity title in Arabic is required')
        )
        .max(
          255,
          t('opportunities:form.errors.titleArMax', 'Arabic title cannot exceed 255 characters')
        ),
      title_en: z
        .string()
        .min(
          1,
          t('opportunities:form.errors.titleEnRequired', 'Opportunity title in English is required')
        )
        .max(
          255,
          t('opportunities:form.errors.titleEnMax', 'English title cannot exceed 255 characters')
        ),
      department_ar: z.string().max(255).optional(),
      department_en: z.string().max(255).optional(),
      opportunity_type_id: z
        .string({
          required_error: t(
            'opportunities:form.errors.opportunityTypeRequired',
            'Please select an opportunity type'
          ),
        })
        .min(
          1,
          t(
            'opportunities:form.errors.opportunityTypeRequired',
            'Please select an opportunity type'
          )
        ),
      training_cycle_id: z.string().optional(),
      work_mode: z.enum(['full_time', 'part_time', 'remote', 'hybrid']),
      location: z.string().max(255).optional(),
      duration: z.string().max(100).optional(),
      capacity: z
        .number({
          invalid_type_error: t(
            'opportunities:form.errors.capacityMin',
            'Capacity must be at least 1'
          ),
        })
        .int()
        .min(1, t('opportunities:form.errors.capacityMin', 'Capacity must be at least 1')),
      salary: z
        .string()
        .optional()
        .refine(
          (val) => {
            if (!val || val.trim() === '') return true;
            const num = parseFloat(val);
            return !isNaN(num) && num >= 0;
          },
          {
            message: t('opportunities:form.errors.salaryMin', 'Salary must be 0 or greater'),
          }
        ),
      start_date: z.string().optional(),
      end_date: z.string().optional(),
      application_deadline: z.string().optional(),
      description_ar: z
        .string()
        .min(
          1,
          t(
            'opportunities:form.errors.descriptionArRequired',
            'Opportunity description in Arabic is required'
          )
        )
        .max(
          5000,
          t(
            'opportunities:form.errors.descriptionArMax',
            'Arabic description cannot exceed 5000 characters'
          )
        ),
      description_en: z
        .string()
        .min(
          1,
          t(
            'opportunities:form.errors.descriptionEnRequired',
            'Opportunity description in English is required'
          )
        )
        .max(
          5000,
          t(
            'opportunities:form.errors.descriptionEnMax',
            'English description cannot exceed 5000 characters'
          )
        ),
      requirements_ar_text: z.string().optional(),
      requirements_en_text: z.string().optional(),
      benefits_ar_text: z.string().optional(),
      benefits_en_text: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      // Date order check
      if (data.start_date && data.end_date) {
        if (new Date(data.end_date) < new Date(data.start_date)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t(
              'opportunities:form.errors.endDateAfterStart',
              'End date must be after or equal to start date'
            ),
            path: ['end_date'],
          });
        }
      }

      // Application deadline checks
      if (data.application_deadline) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const deadlineDate = new Date(data.application_deadline);
        deadlineDate.setHours(0, 0, 0, 0);

        if (deadlineDate < today) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t(
              'opportunities:form.errors.deadlineMustBeFuture',
              'آخر موعد للتقديم يجب أن يكون اليوم أو تاريخاً مستقبلياً'
            ),
            path: ['application_deadline'],
          });
        } else if (data.start_date) {
          const startDate = new Date(data.start_date);
          startDate.setHours(0, 0, 0, 0);
          if (deadlineDate > startDate) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: t(
                'opportunities:form.errors.deadlineBeforeStartDate',
                'آخر موعد للتقديم يجب أن يكون قبل أو يوافق تاريخ بدء التدريب'
              ),
              path: ['application_deadline'],
            });
          }
        }
      }

      // Requirements line count parity check
      const reqArLines = (data.requirements_ar_text || '')
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      const reqEnLines = (data.requirements_en_text || '')
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      if (
        (reqArLines.length > 0 || reqEnLines.length > 0) &&
        reqArLines.length !== reqEnLines.length
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t(
            'opportunities:form.errors.requirementsCountMismatch',
            'Arabic and English requirements count must match'
          ),
          path: ['requirements_en_text'],
        });
      }

      // Benefits line count parity check
      const benArLines = (data.benefits_ar_text || '')
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      const benEnLines = (data.benefits_en_text || '')
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      if (
        (benArLines.length > 0 || benEnLines.length > 0) &&
        benArLines.length !== benEnLines.length
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: t(
            'opportunities:form.errors.benefitsCountMismatch',
            'Arabic and English benefits count must match'
          ),
          path: ['benefits_en_text'],
        });
      }
    });
};

export type OpportunityFormValues = z.infer<ReturnType<typeof createOpportunitySchema>>;
