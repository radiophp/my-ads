'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, Save } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  useCreateAdminSlideMutation,
  useGetAdminSlideItemQuery,
  useUpdateAdminSlideMutation,
} from '@/features/api/apiSlice';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { SlideImageUploader } from '@/components/admin/slide-image-uploader';
import { cn } from '@/lib/utils';

type SlideFormState = {
  title: string;
  description: string;
  linkUrl: string;
  linkLabel: string;
  imageDesktopUrl: string;
  imageTabletUrl: string;
  imageMobileUrl: string;
  sortOrder: number;
  isActive: boolean;
};

type AdminSlideFormProps = {
  mode: 'create' | 'edit';
  slideId?: string;
};

const emptyForm: SlideFormState = {
  title: '',
  description: '',
  linkUrl: '',
  linkLabel: '',
  imageDesktopUrl: '',
  imageTabletUrl: '',
  imageMobileUrl: '',
  sortOrder: 0,
  isActive: true,
};

export function AdminSlideForm({ mode, slideId }: AdminSlideFormProps) {
  const t = useTranslations('admin.slides');
  const router = useRouter();
  const { toast } = useToast();
  const [createSlide, { isLoading: isCreating }] = useCreateAdminSlideMutation();
  const [updateSlide, { isLoading: isUpdating }] = useUpdateAdminSlideMutation();
  const {
    data: slideItem,
    isLoading: isLoadingItem,
    isFetching: isFetchingItem,
  } = useGetAdminSlideItemQuery(slideId!, { skip: mode !== 'edit' || !slideId });

  const [form, setForm] = useState<SlideFormState>(() => ({ ...emptyForm }));
  const [prefillKey, setPrefillKey] = useState<string | null>(null);

  const loading = isLoadingItem || isFetchingItem;
  const busy = isCreating || isUpdating || loading;

  useEffect(() => {
    setPrefillKey(null);
    setForm({ ...emptyForm });
  }, [slideId, mode]);

  useEffect(() => {
    if (mode !== 'edit' || !slideItem) {
      return;
    }
    if (prefillKey === slideItem.id) {
      return;
    }
    setForm({
      title: slideItem.title ?? '',
      description: slideItem.description ?? '',
      linkUrl: slideItem.linkUrl ?? '',
      linkLabel: slideItem.linkLabel ?? '',
      imageDesktopUrl: slideItem.imageDesktopUrl ?? '',
      imageTabletUrl: slideItem.imageTabletUrl ?? '',
      imageMobileUrl: slideItem.imageMobileUrl ?? '',
      sortOrder: slideItem.sortOrder ?? 0,
      isActive: slideItem.isActive ?? true,
    });
    setPrefillKey(slideItem.id);
  }, [mode, prefillKey, slideItem]);

  const formTitle = mode === 'edit' ? t('form.editTitle') : t('form.createTitle');
  const formDescription = mode === 'edit' ? t('form.editDescription') : t('form.createDescription');

  const normalizedSortOrder = useMemo(() => Number(form.sortOrder) || 0, [form.sortOrder]);

  const submit = async () => {
    if (!form.imageDesktopUrl.trim()) {
      toast({
        title: t('toast.missingTitle'),
        description: t('toast.missingImage'),
        variant: 'destructive',
      });
      return;
    }

    try {
      if (mode === 'edit' && slideId) {
        await updateSlide({
          id: slideId,
          body: {
            title: form.title || undefined,
            description: form.description || undefined,
            linkUrl: form.linkUrl || undefined,
            linkLabel: form.linkLabel || undefined,
            imageDesktopUrl: form.imageDesktopUrl,
            imageTabletUrl: form.imageTabletUrl || undefined,
            imageMobileUrl: form.imageMobileUrl || undefined,
            sortOrder: normalizedSortOrder,
            isActive: form.isActive,
          },
        }).unwrap();
        toast({ title: t('toast.updatedTitle'), description: t('toast.updatedDescription') });
      } else {
        await createSlide({
          title: form.title || undefined,
          description: form.description || undefined,
          linkUrl: form.linkUrl || undefined,
          linkLabel: form.linkLabel || undefined,
          imageDesktopUrl: form.imageDesktopUrl,
          imageTabletUrl: form.imageTabletUrl || undefined,
          imageMobileUrl: form.imageMobileUrl || undefined,
          sortOrder: normalizedSortOrder,
          isActive: form.isActive,
        }).unwrap();
        toast({ title: t('toast.createdTitle'), description: t('toast.createdDescription') });
      }

      router.push('/admin/slides');
      router.refresh();
    } catch (error) {
      toast({
        title: t('toast.errorTitle'),
        description: t('toast.errorDescription'),
        variant: 'destructive',
      });
      console.error(error);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-col gap-4">
          <div>
            <CardTitle>{formTitle}</CardTitle>
            <CardDescription>{formDescription}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t('fields.title')}</label>
              <Input
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder={t('fields.titlePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t('fields.sortOrder')}</label>
              <Input
                type="number"
                value={form.sortOrder}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, sortOrder: Number(event.target.value) || 0 }))
                }
                placeholder={t('fields.sortOrderPlaceholder')}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-foreground">{t('fields.description')}</label>
              <Textarea
                rows={3}
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder={t('fields.descriptionPlaceholder')}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-foreground">{t('fields.linkUrl')}</label>
              <Input
                value={form.linkUrl}
                onChange={(event) => setForm((prev) => ({ ...prev, linkUrl: event.target.value }))}
                placeholder={t('fields.linkUrlPlaceholder')}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-foreground">{t('fields.linkLabel')}</label>
              <Input
                value={form.linkLabel}
                onChange={(event) => setForm((prev) => ({ ...prev, linkLabel: event.target.value }))}
                placeholder={t('fields.linkLabelPlaceholder')}
              />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <SlideImageUploader
              value={form.imageDesktopUrl || null}
              onChange={(value) => setForm((prev) => ({ ...prev, imageDesktopUrl: value ?? '' }))}
              label={t('image.desktopLabel')}
              helper={t('image.desktopHelper')}
              disabled={busy}
            />
            <SlideImageUploader
              value={form.imageTabletUrl || null}
              onChange={(value) => setForm((prev) => ({ ...prev, imageTabletUrl: value ?? '' }))}
              label={t('image.tabletLabel')}
              helper={t('image.tabletHelper')}
              disabled={busy}
            />
            <SlideImageUploader
              value={form.imageMobileUrl || null}
              onChange={(value) => setForm((prev) => ({ ...prev, imageMobileUrl: value ?? '' }))}
              label={t('image.mobileLabel')}
              helper={t('image.mobileHelper')}
              disabled={busy}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/60 p-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">{t('fields.isActive')}</p>
              <p className="text-xs text-muted-foreground">{t('fields.isActiveHint')}</p>
            </div>
            <Switch
              checked={form.isActive}
              onCheckedChange={(value) => setForm((prev) => ({ ...prev, isActive: value }))}
              disabled={busy}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="secondary" onClick={() => router.push('/admin/slides')}>
              <ArrowRight className="mr-2 size-4" aria-hidden />
              {t('actions.back')}
            </Button>
            <Button type="button" onClick={() => void submit()} disabled={busy}>
              {busy ? (
                <Loader2 className={cn('mr-2 size-4', 'animate-spin')} aria-hidden />
              ) : (
                <Save className="mr-2 size-4" aria-hidden />
              )}
              {t('actions.save')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
