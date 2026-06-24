'use client';

import type { ReactNode } from 'react';
import { useWatch, type UseFormReturn } from 'react-hook-form';
import { DollarSign, Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PACKAGE_FEATURES } from '@/components/admin/constants/package-features.constants';
import type { PackageFormValues } from '@/components/admin/package-form-defs';
import type { PackagePricingBreakdown } from '@/types/feature-base-prices';

export type PackageFormTexts = {
  title: string;
  description: string;
  durationDays: string;
  freeDays: string;
  includedUsers: string;
  isTrial: string;
  isTrialHint: string;
  trialOncePerUser: string;
  trialOncePerUserHint: string;
  actualPrice: string;
  discountedPrice: string;
  capabilities: string;
  capabilitiesHint: string;
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
  imageUploader?: ReactNode;
  pricingBreakdown?: PackagePricingBreakdown | null;
  isCalculating?: boolean;
  durationDays?: number;
};

export function PackageForm({
  form,
  onSubmit,
  texts,
  isSubmitting,
  submitIcon,
  secondaryAction,
  imageUploader,
  pricingBreakdown,
  isCalculating,
  durationDays,
}: PackageFormProps) {
  const t = useTranslations('admin.packages.form.capabilityFormLabels');
  const fl = useTranslations('admin.packages.form.capabilityFormLabels');
  const locale = useLocale();
  const isTrial = useWatch({ control: form.control, name: 'isTrial' });
  const featureEntries = Object.entries(PACKAGE_FEATURES).sort(([keyA], [keyB]) => {
    const endKeys = ['allow_discount_codes', 'allow_invite_codes'];
    const aEnd = endKeys.includes(keyA) ? 1 : 0;
    const bEnd = endKeys.includes(keyB) ? 1 : 0;
    return aEnd - bEnd;
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid gap-5 md:grid-cols-4">
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
          {imageUploader && (
            <div className="order-2 md:order-1">
              {imageUploader}
            </div>
          )}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className={`flex flex-col ${imageUploader ? 'h-full' : 'md:col-span-2'}`}>
                <FormLabel>{texts.description}</FormLabel>
                <FormControl className="flex-1">
                  <Textarea
                    {...field}
                    className="min-h-[180px]"
                    placeholder="Describe the benefits users receive with this package"
                  />
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

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="isTrial"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border border-border/60 p-4">
                <div className="space-y-1">
                  <FormLabel>{texts.isTrial}</FormLabel>
                  <FormDescription>{texts.isTrialHint}</FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="trialOncePerUser"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border border-border/60 p-4">
                <div className="space-y-1">
                  <FormLabel>{texts.trialOncePerUser}</FormLabel>
                  <FormDescription>{texts.trialOncePerUserHint}</FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={!isTrial}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {featureEntries.length > 0 && (
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-base font-semibold">{texts.capabilities}</CardTitle>
              <p className="text-sm text-muted-foreground">{texts.capabilitiesHint}</p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {featureEntries.map(([key, feature]) => {
                  const fieldKey = `features.${key}` as const;

                  if (feature.type === 'BOOLEAN') {
                    return (
                      <FormField
                        key={key}
                        control={form.control}
                        name={fieldKey}
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border border-border/60 p-4">
                            <FormLabel className="mb-0">
                              {t(key)}
                            </FormLabel>
                            <FormControl>
                              <Switch
                                checked={field.value === 'true'}
                                onCheckedChange={(checked) =>
                                  field.onChange(checked ? 'true' : 'false')
                                }
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    );
                  }

                  return (
                    <FormField
                      key={key}
                      control={form.control}
                      name={fieldKey}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t(key)}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              min={0}
                              inputMode="numeric"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {pricingBreakdown && durationDays && durationDays > 0 && (
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <DollarSign className="size-4" aria-hidden />
                پیش‌نمایش قیمت
              </CardTitle>
              <CardDescription>
                محاسبه شده بر اساس قیمت پایه ویژگی‌ها
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Subscription features */}
                {pricingBreakdown.features.some((f) => !f.isPermanent && Number.parseFloat(f.dailyTotal) / 10 > 0) && (
                  <>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      اشتراک (ماهیانه)
                    </div>
                    <div className="space-y-2">
                      {pricingBreakdown.features
                        .filter((f) => !f.isPermanent)
                        .map((f) => {
                          const dailyToman = Math.round(Number.parseFloat(f.dailyTotal) / 10);
                          if (dailyToman <= 0) return null;
                          return (
                            <div key={f.featureKey} className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">{fl(f.featureKey)}</span>
                              <span className="font-medium tabular-nums text-foreground" dir="ltr">
                                {Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(dailyToman)}{' '}
                                <span className="text-xs text-muted-foreground">تومان/روز</span>
                              </span>
                            </div>
                          );
                        })}
                    </div>
                    <div className="border-t border-border/60" />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">جمع روزانه</span>
                      <span className="tabular-nums text-foreground" dir="ltr">
                        {Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(
                          Math.round(Number.parseFloat(pricingBreakdown.subscriptionDailyTotal) / 10),
                        )}{' '}
                        <span className="text-xs text-muted-foreground">تومان</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm font-semibold">
                      <span className="text-muted-foreground">جمع برای {durationDays} روز</span>
                      <span className="tabular-nums text-foreground" dir="ltr">
                        {Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(
                          Math.round(Number.parseFloat(pricingBreakdown.subscriptionTotalForDuration) / 10),
                        )}{' '}
                        <span className="text-xs text-muted-foreground">تومان</span>
                      </span>
                    </div>
                  </>
                )}

                {/* Permanent features */}
                {pricingBreakdown.features.some((f) => f.isPermanent && Number.parseFloat(f.oneTimeTotal) / 10 > 0) && (
                  <>
                    <div className="border-t border-border/60" />
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      یک‌بار (دائمی)
                    </div>
                    <div className="space-y-2">
                      {pricingBreakdown.features
                        .filter((f) => f.isPermanent)
                        .map((f) => {
                          const oneTimeToman = Math.round(Number.parseFloat(f.oneTimeTotal) / 10);
                          if (oneTimeToman <= 0) return null;
                          return (
                            <div key={f.featureKey} className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">{fl(f.featureKey)}</span>
                              <span className="font-medium tabular-nums text-foreground" dir="ltr">
                                {Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(oneTimeToman)}{' '}
                                <span className="text-xs text-muted-foreground">تومان</span>
                              </span>
                            </div>
                          );
                        })}
                    </div>
                    <div className="flex items-center justify-between text-sm font-semibold">
                      <span className="text-muted-foreground">جمع یک‌بار</span>
                      <span className="tabular-nums text-foreground" dir="ltr">
                        {Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(
                          Math.round(Number.parseFloat(pricingBreakdown.oneTimeTotal) / 10),
                        )}{' '}
                        <span className="text-xs text-muted-foreground">تومان</span>
                      </span>
                    </div>
                  </>
                )}

                {/* Grand total */}
                {Number.parseFloat(pricingBreakdown.subscriptionTotalForDuration) > 0 &&
                  Number.parseFloat(pricingBreakdown.oneTimeTotal) > 0 && (
                    <>
                      <div className="border-t border-border/60" />
                      <div className="flex items-center justify-between text-sm font-bold">
                        <span className="text-foreground">جمع کل</span>
                        <span className="tabular-nums text-foreground" dir="ltr">
                          {Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(
                            Math.round(Number.parseFloat(pricingBreakdown.grandTotal) / 10),
                          )}{' '}
                          <span className="text-xs text-muted-foreground">تومان</span>
                        </span>
                      </div>
                    </>
                  )}
              </div>
            </CardContent>
          </Card>
        )}

        {isCalculating && (
          <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            در حال محاسبه...
          </div>
        )}

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
