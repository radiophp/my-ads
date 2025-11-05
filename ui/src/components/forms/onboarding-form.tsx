'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { useMemo } from 'react';
import type { JSX } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { onboardingFormSchema, type OnboardingFormValues } from '@/lib/validators';

export function OnboardingForm(): JSX.Element {
  const t = useTranslations('onboarding');
  const schema = useMemo(() => onboardingFormSchema(t), [t]);

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      email: '',
      company: '',
      terms: true,
    },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    toast({
      title: t('toast.title'),
      description: t('toast.description', {
        name: values.name,
        company: values.company || t('companyFallback'),
      }),
    });
    form.reset({ ...values });
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Form {...form}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fields.name.label')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('fields.name.placeholder')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fields.email.label')}</FormLabel>
                <FormControl>
                  <Input type="email" placeholder={t('fields.email.placeholder')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="company"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('fields.company.label')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('fields.company.placeholder')} {...field} />
                </FormControl>
                <FormDescription>{t('fields.company.description')}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="terms"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2 space-y-0">
                <input
                  id="terms"
                  type="checkbox"
                  className="size-4 rounded border border-input accent-primary"
                  checked={field.value}
                  onChange={(event) => field.onChange(event.target.checked)}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
                <FormLabel htmlFor="terms" className="!mt-0">
                  {t('fields.terms.label')}
                </FormLabel>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full sm:w-auto">
            {t('button')}
          </Button>
        </form>
      </Form>
    </motion.div>
  );
}
