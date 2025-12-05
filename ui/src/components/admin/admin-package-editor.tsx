'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
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
} from '@/features/api/apiSlice';
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

  const isEditing = mode === 'edit';

  const {
    data: existingPackage,
    isLoading: isLoadingPackage,
    isFetching: isFetchingPackage,
  } = useGetPackageQuery(packageId!, {
    skip: !isEditing || !packageId,
  });

  useEffect(() => {
    if (isEditing && existingPackage) {
      form.reset({
        title: existingPackage.title,
        description: existingPackage.description ?? '',
        durationDays: existingPackage.durationDays,
        freeDays: existingPackage.freeDays,
        includedUsers: existingPackage.includedUsers,
        savedFiltersLimit: existingPackage.savedFiltersLimit,
        actualPrice: Number.parseFloat(existingPackage.actualPrice),
        discountedPrice: Number.parseFloat(existingPackage.discountedPrice),
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
      savedFiltersLimit: t('form.fields.savedFiltersLimit'),
      actualPrice: t('form.fields.actualPrice'),
      discountedPrice: t('form.fields.discountedPrice'),
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

  const imageValue = form.watch('imageUrl') || '';

  const handleSubmit = async (values: PackageFormValues) => {
    const payload = {
      title: values.title.trim(),
      description: values.description?.trim() ? values.description.trim() : null,
      imageUrl: values.imageUrl?.trim() ? values.imageUrl.trim() : null,
      durationDays: values.durationDays,
      freeDays: values.freeDays,
      includedUsers: values.includedUsers,
      savedFiltersLimit: values.savedFiltersLimit,
      actualPrice: values.actualPrice,
      discountedPrice: values.discountedPrice,
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
              <PackageImageUploader
                value={imageValue ? imageValue : null}
                onChange={handleImageChange}
                disabled={isSubmitting}
                texts={imageTexts}
              />
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
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
