'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
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
import {
  createDiscountCodeDefaultValues,
  discountCodeSchemaFactory,
  type DiscountCodeFormValues,
} from '@/components/admin/discount-code-form-defs';
import { DiscountCodeForm } from '@/components/admin/discount-code-form';
import { useToast } from '@/components/ui/use-toast';
import {
  useCreateDiscountCodeMutation,
  useGetDiscountCodeQuery,
  useGetPackagesQuery,
  useUpdateDiscountCodeMutation,
} from '@/features/api/apiSlice';
import { Link } from '@/i18n/routing';

type AdminDiscountCodeEditorProps = {
  mode: 'create' | 'edit';
  discountCodeId?: string;
};

const formatDateInput = (value: string | null | undefined) =>
  value ? value.slice(0, 10) : '';

export function AdminDiscountCodeEditor({
  mode,
  discountCodeId,
}: AdminDiscountCodeEditorProps) {
  const t = useTranslations('admin.discountCodes');
  const editorT = useTranslations('admin.discountCodes.editor');
  const router = useRouter();
  const { toast } = useToast();

  const schema = useMemo(() => discountCodeSchemaFactory(t), [t]);

  const form = useForm<DiscountCodeFormValues>({
    resolver: zodResolver(schema),
    defaultValues: createDiscountCodeDefaultValues,
    mode: 'onBlur',
  });

  const [createDiscountCode, { isLoading: isCreating }] = useCreateDiscountCodeMutation();
  const [updateDiscountCode, { isLoading: isUpdating }] = useUpdateDiscountCodeMutation();

  const { data: packages = [] } = useGetPackagesQuery();
  const packageOptions = useMemo(
    () => packages.map((pkg) => ({ id: pkg.id, title: pkg.title })),
    [packages],
  );

  const isEditing = mode === 'edit';

  const {
    data: existingCode,
    isLoading: isLoadingCode,
    isFetching: isFetchingCode,
  } = useGetDiscountCodeQuery(discountCodeId!, {
    skip: !isEditing || !discountCodeId,
  });

  useEffect(() => {
    if (isEditing && existingCode) {
      form.reset({
        code: existingCode.code,
        description: existingCode.description ?? '',
        type: existingCode.type,
        value: Number.parseFloat(existingCode.value),
        maxRedemptions: existingCode.maxRedemptions ?? undefined,
        maxRedemptionsPerUser: existingCode.maxRedemptionsPerUser ?? undefined,
        validFrom: formatDateInput(existingCode.validFrom),
        validTo: formatDateInput(existingCode.validTo),
        packageId: existingCode.packageId ?? '',
        isActive: existingCode.isActive,
      });
    }
  }, [existingCode, form, isEditing]);

  const formTexts = useMemo(
    () => ({
      code: t('form.fields.code'),
      description: t('form.fields.description'),
      type: t('form.fields.type'),
      typePercent: t('form.fields.typePercent'),
      typeFixed: t('form.fields.typeFixed'),
      value: t('form.fields.value'),
      maxRedemptions: t('form.fields.maxRedemptions'),
      maxRedemptionsPerUser: t('form.fields.maxRedemptionsPerUser'),
      validFrom: t('form.fields.validFrom'),
      validTo: t('form.fields.validTo'),
      package: t('form.fields.package'),
      packagePlaceholder: t('form.fields.packagePlaceholder'),
      isActive: t('form.fields.isActive'),
      isActiveHint: t('form.fields.isActiveHint'),
      submit: isEditing ? t('form.updateSubmit') : t('form.createSubmit'),
      cancel: t('form.cancel'),
    }),
    [isEditing, t],
  );

  const headerTitle = isEditing ? editorT('updateTitle') : editorT('createTitle');
  const headerDescription = isEditing
    ? editorT('updateDescription')
    : editorT('createDescription');

  const isSubmitting = isCreating || isUpdating || form.formState.isSubmitting;
  const isLoadingData = isEditing && (isLoadingCode || isFetchingCode);

  const handleSubmit = useCallback(
    async (values: DiscountCodeFormValues) => {
      const payload = {
        code: values.code.trim(),
        description: values.description?.trim() ? values.description.trim() : null,
        type: values.type,
        value: values.value,
        maxRedemptions: values.maxRedemptions ?? null,
        maxRedemptionsPerUser: values.maxRedemptionsPerUser ?? null,
        validFrom: values.validFrom ? values.validFrom : null,
        validTo: values.validTo ? values.validTo : null,
        packageId: values.packageId ? values.packageId : null,
        isActive: values.isActive,
      };

      try {
        if (isEditing && discountCodeId) {
          await updateDiscountCode({ id: discountCodeId, body: payload }).unwrap();
          toast({
            title: t('toast.updatedTitle'),
            description: t('toast.updatedDescription'),
          });
        } else {
          await createDiscountCode(payload).unwrap();
          toast({
            title: t('toast.createdTitle'),
            description: t('toast.createdDescription'),
          });
        }
        router.push('/admin/discount-codes');
      } catch (error) {
        console.error('Failed to submit discount code', error);
        toast({
          title: t('toast.errorTitle'),
          description: t('toast.errorDescription'),
          variant: 'destructive',
        });
      }
    },
    [
      createDiscountCode,
      discountCodeId,
      isEditing,
      router,
      t,
      toast,
      updateDiscountCode,
    ],
  );

  return (
    <div className="flex w-full flex-col gap-6 px-4 py-8">
      <div className="flex items-center gap-2">
        <Button variant="ghost" asChild>
          <Link href="/admin/discount-codes">
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
            <DiscountCodeForm
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
                    onClick={() => form.reset(createDiscountCodeDefaultValues)}
                    disabled={isSubmitting}
                  >
                    {editorT('reset')}
                  </Button>
                )
              }
              packages={packageOptions}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
