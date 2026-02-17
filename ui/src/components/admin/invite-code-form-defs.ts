'use client';

import { z } from 'zod';

const requiredInt = (message: string) =>
  z.preprocess(
    (value) => {
      if (value === '' || value === null || typeof value === 'undefined') {
        return undefined;
      }
      const numeric = Number(value);
      return Number.isNaN(numeric) ? value : numeric;
    },
    z.number().int().min(0, message),
  );

export const inviteCodeSchemaFactory = (t: (key: string) => string) =>
  z.object({
    code: z
      .string()
      .trim()
      .min(1, t('validation.codeRequired'))
      .max(64, t('validation.codeMax')),
    inviterUserId: z.string().uuid(t('validation.inviterRequired')),
    bonusDays: requiredInt(t('validation.bonusDaysMin')),
    monthlyInviteLimit: requiredInt(t('validation.monthlyInviteLimitMin')),
    isActive: z.boolean(),
  });

export type InviteCodeFormSchema = ReturnType<typeof inviteCodeSchemaFactory>;
export type InviteCodeFormValues = z.infer<InviteCodeFormSchema>;

export const createInviteCodeDefaultValues: InviteCodeFormValues = {
  code: '',
  inviterUserId: '',
  bonusDays: 0,
  monthlyInviteLimit: 3,
  isActive: true,
};
