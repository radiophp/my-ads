'use client';

import type { JSX, ReactNode } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { PackageFormValues } from '@/components/admin/admin-packages-manager';

export type PackageFormTexts = {
  title: string;
  description: string;
  durationDays: string;
  freeDays: string;
  includedUsers: string;
  actualPrice: string;
  discountedPrice: string;
  submit: string;
  cancel: string;
};

type PackageFormProps = {
  form: UseFormReturn<PackageFormValues>;
  onSubmit: (values: PackageFormValues) => Promise<void> | void;
  texts: PackageFormTexts;
  isSubmitting: boolean;
  submitIcon?: ReactNode;
  secondaryAction?: ReactNode;
};

export function PackageForm({
  form,
  onSubmit,
  texts,
  isSubmitting,
  submitIcon,
  secondaryAction,
}: PackageFormProps): JSX.Element {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{texts.title}</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Premium package" autoComplete="off" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-5 md:grid-cols-2">
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>{texts.description}</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Describe the benefits users receive with this package"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <FormField
            control={form.control}
            name="durationDays"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{texts.durationDays}</FormLabel>
                <FormControl>
                  <Input {...field} type="number" min={1} inputMode="numeric" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="freeDays"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{texts.freeDays}</FormLabel>
                <FormControl>
                  <Input {...field} type="number" min={0} inputMode="numeric" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="includedUsers"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{texts.includedUsers}</FormLabel>
                <FormControl>
                  <Input {...field} type="number" min={1} inputMode="numeric" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <FormField
            control={form.control}
            name="actualPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{texts.actualPrice}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="discountedPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{texts.discountedPrice}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex items-center justify-end gap-2">
          {secondaryAction ?? null}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                {texts.submit}
              </>
            ) : (
              <>
                {submitIcon ?? null}
                {texts.submit}
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
