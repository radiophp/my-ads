'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { Loader2, Save, ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { PackageForm } from '@/components/admin/package-form';
import {
  createPackageDefaultValues,
  packageSchemaFactory,
  type PackageFormValues,
} from '@/components/admin/package-form-defs';
import { PackageImageUploader } from '@/components/admin/package-image-uploader';
import { useToast } from '@/components/ui/use-toast';
import {
  useCreatePackageMutation,
  useGetPackageQuery,
  useUpdatePackageMutation,
} from '@/features/api/endpoints/packages';
import { useCalculatePricingMutation } from '@/features/api/endpoints/feature-base-prices';
import type { PackagePricingBreakdown } from '@/types/feature-base-prices';
import { Link } from '@/i18n/routing';

type AdminPackageEditorProps = {
  mode: 'create' | 'edit';
  packageId?: string;
};

export function AdminPackageEditor({ mode, packageId }: AdminPackageEditorProps) {
  const t = useTranslations('admin.packages');
  const editorT = useTranslations('admin.packages.editor');
  const router = useRouter();
  const { toast } = useToast();

  const schema = useMemo(() => packageSchemaFactory(t), [t]);

  const form = useForm<PackageFormValues>({
    resolver: zodResolver(schema),
    defaultValues: createPackageDefaultValues,
    mode: 'onBlur',
  });

  const [createPackage, { isLoading: isCreating }] = useCreatePackageMutation();
  const [updatePackage, { isLoading: isUpdating }] = useUpdatePackageMutation();
  const [calculatePricing, { isLoading: isCalculating }] = useCalculatePricingMutation();

  const isEditing = mode === 'edit';

  const watchedFeatures = useWatch({ control: form.control, name: 'features' });
  const watchedDurationDays = useWatch({ control: form.control, name: 'durationDays' });
  const [pricing, setPricing] = useState<PackagePricingBreakdown | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!watchedDurationDays || watchedDurationDays < 1) {
      setPricing(null);
      return;
    }

    const configs = Object.entries(watchedFeatures ?? {}).map(([featureKey, value]) => ({
      featureKey,
      limitValue:
        value === 'true' ? 1 : value === 'false' ? 0 : Number.parseInt(value, 10) || 0,
    }));

    debounceRef.current = setTimeout(async () => {
      try {
        const result = await calculatePricing({
          durationDays: watchedDurationDays,
          featureConfigs: configs,
        }).unwrap();
        setPricing(result);
      } catch {
        setPricing(null);
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [watchedFeatures, watchedDurationDays, calculatePricing]);

  const {
    data: existingPackage,
    isLoading: isLoadingPackage,
    isFetching: isFetchingPackage,
  } = useGetPackageQuery(packageId!, {
    skip: !isEditing || !packageId,
  });

  useEffect(() => {
    if (isEditing && existingPackage) {
      const meta: Record<string, Record<string, unknown>> = {};
      if (existingPackage.featureConfigs) {
        for (const fc of existingPackage.featureConfigs as Array<Record<string, unknown>>) {
          meta[fc.featureKey as string] = {
            allowExtra: fc.allowExtra ?? false,
            maxExtra: fc.maxExtra ?? 0,
            extraUnitPrice: fc.extraUnitPrice ?? undefined,
            allowRollover: fc.allowRollover ?? false,
            maxRolloverCap: fc.maxRolloverCap ?? 0,
          };
        }
      }
      form.reset({
        title: existingPackage.title,
        description: existingPackage.description ?? '',
        imageUrl: existingPackage.imageUrl ?? '',
        durationDays: existingPackage.durationDays,
        freeDays: existingPackage.freeDays,
        includedUsers: existingPackage.includedUsers,
        isTrial: existingPackage.isTrial,
        trialOncePerUser: existingPackage.trialOncePerUser,
        actualPrice: Number.parseFloat(existingPackage.actualPrice),
        discountedPrice: Number.parseFloat(existingPackage.discountedPrice),
        features: { ...createPackageDefaultValues.features, ...existingPackage.features },
        featureMeta: meta as Record<string, Record<string, unknown>>,
      });
    }
  }, [existingPackage, form, isEditing]);

  const formTexts = useMemo(
    () => ({
      title: t('form.fields.title'),
      description: t('form.fields.description'),
      durationDays: t('form.fields.durationDays'),
      freeDays: t('form.fields.freeDays'),
      includedUsers: t('form.fields.includedUsers'),
      isTrial: t('form.fields.isTrial'),
      isTrialHint: t('form.fields.isTrialHint'),
      trialOncePerUser: t('form.fields.trialOncePerUser'),
      trialOncePerUserHint: t('form.fields.trialOncePerUserHint'),
      actualPrice: t('form.fields.actualPrice'),
      discountedPrice: t('form.fields.discountedPrice'),
      capabilities: t('form.capabilities.title'),
      capabilitiesHint: t('form.capabilities.hint'),
      submit: isEditing ? t('form.updateSubmit') : t('form.createSubmit'),
      cancel: t('form.cancel'),
    }),
    [isEditing, t],
  );

  const imageTexts = useMemo(
    () => ({
      title: t('form.imageUpload.title'),
      helper: t('form.imageUpload.helper'),
      cta: t('form.imageUpload.cta'),
      select: t('form.imageUpload.select'),
      uploading: t('form.imageUpload.uploading'),
      remove: t('form.imageUpload.remove'),
      error: t('form.imageUpload.error'),
    }),
    [t],
  );

  const headerTitle = isEditing ? editorT('updateTitle') : editorT('createTitle');
  const headerDescription = isEditing
    ? editorT('updateDescription')
    : editorT('createDescription');

  const isSubmitting = isCreating || isUpdating || form.formState.isSubmitting;
  const isLoadingData = isEditing && (isLoadingPackage || isFetchingPackage);

  const handleImageChange = useCallback(
    (url: string | null) => {
      form.setValue('imageUrl', url ?? '', { shouldDirty: true });
      form.clearErrors('imageUrl');
    },
    [form],
  );

  const imageValue = useWatch({ control: form.control, name: 'imageUrl' }) || '';

  const handleSubmit = async (values: PackageFormValues) => {
    const payload = {
      title: values.title.trim(),
      description: values.description?.trim() ? values.description.trim() : null,
      imageUrl: values.imageUrl?.trim() ? values.imageUrl.trim() : null,
      durationDays: values.durationDays,
      freeDays: values.freeDays,
      includedUsers: values.includedUsers,
      isTrial: values.isTrial,
      trialOncePerUser: values.trialOncePerUser,
      actualPrice: values.actualPrice,
      discountedPrice: values.discountedPrice,
      features: values.features,
      featureConfigs: Object.entries(values.features).map(([featureKey, value]) => {
        const meta = values.featureMeta?.[featureKey] ?? {};
        return {
          featureKey,
          limitValue: value === 'true' ? 1 : value === 'false' ? 0 : Number.parseInt(value, 10) || 0,
          allowExtra: meta.allowExtra ?? false,
          maxExtra: meta.maxExtra ?? 0,
          extraUnitPrice: meta.extraUnitPrice,
          allowRollover: meta.allowRollover ?? false,
          maxRolloverCap: meta.maxRolloverCap ?? 0,
        };
      }),
    };

    try {
      if (isEditing && packageId) {
        await updatePackage({ id: packageId, body: payload }).unwrap();
        toast({
          title: t('toast.updatedTitle'),
          description: t('toast.updatedDescription'),
        });
      } else {
        await createPackage(payload).unwrap();
        toast({
          title: t('toast.createdTitle'),
          description: t('toast.createdDescription'),
        });
      }
      router.push('/admin/packages');
    } catch (error) {
      console.error('Failed to submit subscription package', error);
      toast({
        title: t('toast.errorTitle'),
        description: t('toast.errorDescription'),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex w-full flex-col gap-6 px-4 py-8">
      <div className="flex items-center gap-2">
        <Button variant="ghost" asChild>
          <Link href="/admin/packages">
            <ArrowLeft className="mr-2 size-4" aria-hidden />
            {editorT('backToList')}
          </Link>
        </Button>
      </div>
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>{headerTitle}</CardTitle>
          <CardDescription>{headerDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingData ? (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" aria-hidden />
              <span>{editorT('loading')}</span>
            </div>
          ) : (
            <>
              <PackageForm
                form={form}
                onSubmit={handleSubmit}
                texts={formTexts}
                isSubmitting={isSubmitting}
                submitIcon={<Save className="mr-2 size-4" aria-hidden />}
                secondaryAction={
                  isEditing ? null : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => form.reset(createPackageDefaultValues)}
                      disabled={isSubmitting}
                    >
                      {editorT('reset')}
                    </Button>
                  )
                }
                imageUploader={
                  <PackageImageUploader
                    value={imageValue ? imageValue : null}
                    onChange={handleImageChange}
                    disabled={isSubmitting}
                    texts={imageTexts}
                  />
                }
                pricingBreakdown={pricing}
                isCalculating={isCalculating}
                durationDays={watchedDurationDays}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
