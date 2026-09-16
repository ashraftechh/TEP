import { z } from 'zod';
import type { TFunction } from 'i18next';

export const createReportSchema = (t: TFunction) => {
  return z
    .object({
      report_type_id: z
        .string({
          required_error: t(
            'reports:validation.reportTypeRequired',
            'Please select a report type.'
          ),
        })
        .min(1, t('reports:validation.reportTypeRequired', 'Please select a report type.')),
      title: z
        .string({
          required_error: t('reports:validation.titleRequired', 'Title is required.'),
        })
        .trim()
        .min(1, t('reports:validation.titleRequired', 'Title is required.'))
        .max(255, t('reports:validation.titleMax', 'Title cannot exceed 255 characters.')),
      report_number: z
        .string()
        .optional()
        .default('1')
        .refine(
          (val) => {
            if (!val) return true;
            const num = parseInt(val, 10);
            return !isNaN(num) && num >= 1;
          },
          {
            message: t(
              'reports:validation.reportNumberInvalid',
              'Enter a valid report number (1 or higher).'
            ),
          }
        ),
      due_at: z
        .string({
          required_error: t('reports:validation.dueAtRequired', 'Due date is required.'),
        })
        .min(1, t('reports:validation.dueAtRequired', 'Due date is required.')),
      content: z
        .string({
          required_error: t('reports:validation.contentRequired', 'Content is required.'),
        })
        .trim()
        .min(1, t('reports:validation.contentRequired', 'Content is required.')),
    })
    .superRefine(() => {});
};

export type ReportFormValues = {
  report_type_id: string;
  title: string;
  report_number: string;
  due_at: string;
  content: string;
};

export const reviewReportSchema = (t: TFunction) => {
  return z
    .object({
      decision: z
        .string({
          required_error: t('supervisor.validation.decisionRequired', {
            defaultValue: 'Please select an evaluation decision.',
          }),
        })
        .min(
          1,
          t('supervisor.validation.decisionRequired', {
            defaultValue: 'Please select an evaluation decision.',
          })
        )
        .refine((val) => ['approved', 'revision_requested', 'rejected'].includes(val), {
          message: t('supervisor.validation.decisionRequired', {
            defaultValue: 'Please select an evaluation decision.',
          }),
        }),
      grade: z.string().optional().default(''),
      feedback: z.string().default(''),
    })
    .superRefine((data, ctx) => {
      // Validate grade if approved
      if (data.decision === 'approved') {
        const trimmedGrade = (data.grade || '').trim();
        const numGrade = parseFloat(trimmedGrade);
        if (!trimmedGrade || isNaN(numGrade)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['grade'],
            message: t('supervisor.validation.gradeRequired', {
              defaultValue: 'A grade is required when approving a report.',
            }),
          });
        } else if (numGrade < 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['grade'],
            message: t('supervisor.validation.gradeMin', {
              defaultValue: 'Grade cannot be less than 0.',
            }),
          });
        } else if (numGrade > 100) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['grade'],
            message: t('supervisor.validation.gradeMax', {
              defaultValue: 'Grade cannot exceed 100.',
            }),
          });
        }
      }

      // Validate feedback per TEP-684 decision-aware rules
      const trimmedFeedback = (data.feedback || '').trim();
      if (!trimmedFeedback) {
        let msg = t('supervisor.validation.feedbackRequired', {
          defaultValue: 'Feedback is required.',
        });
        if (data.decision === 'rejected') {
          msg = t('supervisor.validation.feedbackRequiredReject', {
            defaultValue: 'A reason is required to reject a report.',
          });
        } else if (data.decision === 'revision_requested') {
          msg = t('supervisor.validation.feedbackRequiredRevision', {
            defaultValue: 'A reason is required to request revision on a report.',
          });
        }
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['feedback'],
          message: msg,
        });
      } else if (trimmedFeedback.length > 2000) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['feedback'],
          message: t('supervisor.validation.feedbackMax', {
            defaultValue: 'Feedback cannot exceed 2000 characters.',
          }),
        });
      }
    });
};

export type ReviewReportFormValues = {
  decision: 'approved' | 'revision_requested' | 'rejected' | '';
  grade: string;
  feedback: string;
};
