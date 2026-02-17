'use client';

import { z } from 'zod';

const optionalInt = (message: string) =>
  z.preprocess(
    (value) => {
      if (value === '' || value === null || typeof value === 'undefined') {
        return undefined;
      }
      const numeric = Number(value);
      return Number.isNaN(numeric) ? value : numeric;
    },
    z.number().int().min(1, message).optional(),
  );

const optionalDate = () =>
  z.preprocess(
    (value) => {
      if (value === '' || value === null || typeof value === 'undefined') {
        return undefined;
      }
      return value;
    },
    z.string().optional(),
  );

export const discountCodeSchemaFactory = (t: (key: string) => string) =>
  z
    .object({
      code: z
        .string()
        .trim()
        .min(1, t('validation.codeRequired'))
        .max(64, t('validation.codeMax')),
      description: z
        .string()
        .trim()
        .max(2000, t('validation.descriptionMax'))
        .optional()
        .transform((val) => (val && val.length > 0 ? val : '')),
      type: z.enum(['PERCENT', 'FIXED']),
      value: z.coerce.number().min(0, t('validation.valueMin')),
      maxRedemptions: optionalInt(t('validation.maxRedemptionsMin')),
      maxRedemptionsPerUser: optionalInt(t('validation.maxRedemptionsPerUserMin')),
      validFrom: optionalDate(),
      validTo: optionalDate(),
      packageId: z.string().optional(),
      isActive: z.boolean(),
    })
    .superRefine((data, ctx) => {
      if (data.type === 'PERCENT' && data.value > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['value'],
          message: t('validation.percentMax'),
        });
      }

      if (data.maxRedemptions && data.maxRedemptionsPerUser) {
        if (data.maxRedemptionsPerUser > data.maxRedemptions) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['maxRedemptionsPerUser'],
            message: t('validation.maxPerUserMax'),
          });
        }
      }

      if (data.validFrom && data.validTo) {
        const from = new Date(data.validFrom);
        const to = new Date(data.validTo);
        if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime()) && to < from) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['validTo'],
            message: t('validation.dateRange'),
          });
        }
      }
    });

export type DiscountCodeFormSchema = ReturnType<typeof discountCodeSchemaFactory>;
export type DiscountCodeFormValues = z.infer<DiscountCodeFormSchema>;

export const createDiscountCodeDefaultValues: DiscountCodeFormValues = {
  code: '',
  description: '',
  type: 'PERCENT',
  value: 0,
  maxRedemptions: undefined,
  maxRedemptionsPerUser: undefined,
  validFrom: '',
  validTo: '',
  packageId: '',
  isActive: true,
};
