import { z } from 'zod';

export const onboardingFormSchema = (t: (key: string) => string) =>
  z.object({
    name: z
      .string({ required_error: t('fields.name.required') })
      .min(2, t('fields.name.min')),
    email: z
      .string({ required_error: t('fields.email.required') })
      .email(t('fields.email.invalid')),
    company: z.string().optional(),
    terms: z.literal(true, {
      errorMap: () => ({ message: t('fields.terms.required') })
    })
  });

export type OnboardingFormValues = z.infer<ReturnType<typeof onboardingFormSchema>>;
