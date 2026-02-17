'use client';

import { z } from 'zod';

export const packageSchemaFactory = (t: (key: string) => string) =>
  z
    .object({
      title: z
        .string()
        .trim()
        .min(1, t('validation.titleRequired'))
        .max(120, t('validation.titleMax')),
      description: z
        .string()
        .trim()
        .max(2000, t('validation.descriptionMax'))
        .optional()
        .transform((val) => (val && val.length > 0 ? val : '')),
      imageUrl: z
        .string()
        .trim()
        .optional()
        .refine(
          (val) => !val || val.length === 0 || /^https?:\/\//i.test(val),
          t('validation.imageUrl'),
        )
        .transform((val) => (val && val.length > 0 ? val : '')),
      durationDays: z.coerce
        .number()
        .int(t('validation.durationInteger'))
        .min(1, t('validation.durationMin')),
      freeDays: z.coerce
        .number()
        .int(t('validation.freeDaysInteger'))
        .min(0, t('validation.freeDaysMin')),
      includedUsers: z.coerce
        .number()
        .int(t('validation.includedUsersInteger'))
        .min(1, t('validation.includedUsersMin')),
      savedFiltersLimit: z.coerce
        .number()
        .int(t('validation.savedFiltersInteger'))
        .min(1, t('validation.savedFiltersMin')),
      allowDiscountCodes: z.boolean(),
      allowInviteCodes: z.boolean(),
      isTrial: z.boolean(),
      trialOncePerUser: z.boolean(),
      actualPrice: z.coerce.number().min(0, t('validation.actualPriceMin')),
      discountedPrice: z.coerce.number().min(0, t('validation.discountedPriceMin')),
    })
    .superRefine((data, ctx) => {
      if (data.discountedPrice > data.actualPrice) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['discountedPrice'],
          message: t('validation.discountedPriceLteActual'),
        });
      }
    });

export type PackageFormSchema = ReturnType<typeof packageSchemaFactory>;
export type PackageFormValues = z.infer<PackageFormSchema>;

export const createPackageDefaultValues: PackageFormValues = {
  title: '',
  description: '',
  imageUrl: '',
  durationDays: 30,
  freeDays: 0,
  includedUsers: 1,
  savedFiltersLimit: 5,
  allowDiscountCodes: true,
  allowInviteCodes: true,
  isTrial: false,
  trialOncePerUser: true,
  actualPrice: 0,
  discountedPrice: 0,
};
