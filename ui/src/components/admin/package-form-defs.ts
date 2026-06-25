'use client';

import { z } from 'zod';
import { defaultPackageFeatures, PACKAGE_FEATURES } from '@/components/admin/constants/package-features.constants';

export const featureMetaSchema = z.object({
  allowExtra: z.boolean().optional(),
  maxExtra: z.coerce.number().int().min(0).optional(),
  extraUnitPrice: z.coerce.number().min(0).optional(),
  allowRollover: z.boolean().optional(),
  maxRolloverCap: z.coerce.number().int().min(0).optional(),
});

export type FeatureMeta = z.infer<typeof featureMetaSchema>;

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
      isTrial: z.boolean(),
      trialOncePerUser: z.boolean(),
      actualPrice: z.coerce.number().min(0, t('validation.actualPriceMin')),
      discountedPrice: z.coerce.number().min(0, t('validation.discountedPriceMin')),
      features: z.record(z.string(), z.string()),
      featureMeta: z.record(z.string(), featureMetaSchema).optional().default({}),
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

export function createDefaultFeatureMeta(): Record<string, FeatureMeta> {
  const meta: Record<string, FeatureMeta> = {};
  for (const key of Object.keys(PACKAGE_FEATURES)) {
    meta[key] = {};
  }
  return meta;
}

export const createPackageDefaultValues: PackageFormValues = {
  title: '',
  description: '',
  imageUrl: '',
  durationDays: 30,
  freeDays: 0,
  includedUsers: 1,
  isTrial: false,
  trialOncePerUser: true,
  actualPrice: 0,
  discountedPrice: 0,
  features: defaultPackageFeatures(),
  featureMeta: createDefaultFeatureMeta(),
};
