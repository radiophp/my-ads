'use client';

import type { ReactNode } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { Loader2 } from 'lucide-react';

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
import { Switch } from '@/components/ui/switch';
import type { InviteCodeFormValues } from '@/components/admin/invite-code-form-defs';

export type InviteCodeFormTexts = {
  code: string;
  inviterUserId: string;
  inviterPlaceholder: string;
  bonusDays: string;
  monthlyInviteLimit: string;
  isActive: string;
  isActiveHint: string;
  submit: string;
  cancel: string;
};

type UserOption = {
  id: string;
  label: string;
};

type InviteCodeFormProps = {
  form: UseFormReturn<InviteCodeFormValues>;
  onSubmit: (values: InviteCodeFormValues) => Promise<void> | void;
  texts: InviteCodeFormTexts;
  isSubmitting: boolean;
  submitIcon?: ReactNode;
  secondaryAction?: ReactNode;
  users: UserOption[];
};

export function InviteCodeForm({
  form,
  onSubmit,
  texts,
  isSubmitting,
  submitIcon,
  secondaryAction,
  users,
}: InviteCodeFormProps) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{texts.code}</FormLabel>
              <FormControl>
                <Input {...field} autoComplete="off" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="inviterUserId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{texts.inviterUserId}</FormLabel>
              <FormControl>
                <select
                  className="h-10 w-full appearance-none rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={field.value}
                  onChange={field.onChange}
                >
                  <option value="">{texts.inviterPlaceholder}</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.label}
                    </option>
                  ))}
                </select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-5 md:grid-cols-2">
          <FormField
            control={form.control}
            name="bonusDays"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{texts.bonusDays}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={field.value}
                    onChange={(event) => field.onChange(Number(event.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="monthlyInviteLimit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{texts.monthlyInviteLimit}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={field.value}
                    onChange={(event) => field.onChange(Number(event.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-lg border border-border/60 p-4">
              <div className="space-y-1">
                <FormLabel>{texts.isActive}</FormLabel>
                <FormDescription>{texts.isActiveHint}</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

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
