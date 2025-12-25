'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Loader2, Save, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';

import {
  useCreateAdminFeaturedPostMutation,
  useGetAdminFeaturedPostQuery,
  useLazyLookupAdminFeaturedPostQuery,
  useUpdateAdminFeaturedPostMutation,
} from '@/features/api/apiSlice';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { PostCard } from '@/components/dashboard/divar-posts/post-card';
import type { FeaturedPostLookupResponse } from '@/types/featured-posts';

type FeaturedPostFormState = {
  codeInput: string;
  externalIdInput: string;
  sortOrder: number;
  isActive: boolean;
};

type AdminFeaturedPostFormProps = {
  mode: 'create' | 'edit';
  itemId?: string;
};

const emptyForm: FeaturedPostFormState = {
  codeInput: '',
  externalIdInput: '',
  sortOrder: 0,
  isActive: true,
};

export function AdminFeaturedPostForm({ mode, itemId }: AdminFeaturedPostFormProps) {
  const t = useTranslations('admin.featuredPosts');
  const postT = useTranslations('dashboard.posts');
  const locale = useLocale();
  const router = useRouter();
  const { toast } = useToast();
  const [createItem, { isLoading: isCreating }] = useCreateAdminFeaturedPostMutation();
  const [updateItem, { isLoading: isUpdating }] = useUpdateAdminFeaturedPostMutation();
  const [lookupPost, { isFetching: isLookingUp }] = useLazyLookupAdminFeaturedPostQuery();
  const {
    data: item,
    isLoading: isLoadingItem,
    isFetching: isFetchingItem,
  } = useGetAdminFeaturedPostQuery(itemId!, { skip: mode !== 'edit' || !itemId });

  const [form, setForm] = useState<FeaturedPostFormState>({ ...emptyForm });
  const [prefillKey, setPrefillKey] = useState<string | null>(null);
  const [lookupResult, setLookupResult] = useState<FeaturedPostLookupResponse['post'] | null>(null);

  const loading = isLoadingItem || isFetchingItem;
  const busy = isCreating || isUpdating || loading || isLookingUp;

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        maximumFractionDigits: 0,
      }),
    [locale],
  );

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    [locale],
  );

  const relativeFormatter = useMemo(
    () =>
      new Intl.RelativeTimeFormat(locale, {
        numeric: 'auto',
      }),
    [locale],
  );

  const getRelativeLabel = useCallback(
    (iso: string | null, fallbackJalali?: string | null) => {
      if (iso) {
        const date = new Date(iso);
        const diffMs = date.getTime() - Date.now();
        const divisions: Array<{ amount: number; unit: Intl.RelativeTimeFormatUnit }> = [
          { amount: 60, unit: 'second' },
          { amount: 60, unit: 'minute' },
          { amount: 24, unit: 'hour' },
          { amount: 7, unit: 'day' },
          { amount: 4.34524, unit: 'week' },
          { amount: 12, unit: 'month' },
          { amount: Number.POSITIVE_INFINITY, unit: 'year' },
        ];

        let duration = diffMs / 1000;
        for (const division of divisions) {
          if (Math.abs(duration) < division.amount) {
            return relativeFormatter.format(Math.round(duration), division.unit);
          }
          duration /= division.amount;
        }
      }

      if (fallbackJalali) {
        return fallbackJalali;
      }

      return null;
    },
    [relativeFormatter],
  );

  const formatPrice = useCallback(
    (value: number | string | null | undefined): string | null => {
      const numeric =
        typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : null;
      if (numeric === null || Number.isNaN(numeric) || numeric <= 0) {
        return null;
      }
      return currencyFormatter.format(numeric);
    },
    [currencyFormatter],
  );

  useEffect(() => {
    setPrefillKey(null);
    setForm({ ...emptyForm });
    setLookupResult(null);
  }, [mode, itemId]);

  useEffect(() => {
    if (mode !== 'edit' || !item) {
      return;
    }
    if (prefillKey === item.id) {
      return;
    }
    setForm({
      codeInput: item.post.code ? String(item.post.code) : '',
      externalIdInput: item.post.externalId ?? '',
      sortOrder: item.sortOrder ?? 0,
      isActive: item.isActive ?? true,
    });
    setPrefillKey(item.id);
    const existingCode = item.post.code ?? undefined;
    const existingExternalId = item.post.externalId?.trim();
    if (!existingCode && !existingExternalId) {
      setLookupResult(null);
      return;
    }
    lookupPost({
      code: existingCode,
      externalId: existingExternalId || undefined,
    })
      .unwrap()
      .then((result) => {
        if (!result.found || !result.post) {
          setLookupResult(null);
          return;
        }
        setLookupResult(result.post);
      })
      .catch(() => {
        setLookupResult(null);
      });
  }, [item, lookupPost, mode, prefillKey]);

  const formTitle = mode === 'edit' ? t('form.editTitle') : t('form.createTitle');
  const formDescription = mode === 'edit' ? t('form.editDescription') : t('form.createDescription');

  const parsedCode = useMemo(() => {
    const numeric = Number(form.codeInput);
    if (!Number.isFinite(numeric)) {
      return undefined;
    }
    return numeric;
  }, [form.codeInput]);

  const normalizedSortOrder = useMemo(() => Number(form.sortOrder) || 0, [form.sortOrder]);

  const handleLookup = async () => {
    const externalId = form.externalIdInput.trim();
    if (!parsedCode && !externalId) {
      toast({
        title: t('lookup.missingTitle'),
        description: t('lookup.missingDescription'),
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await lookupPost({
        code: parsedCode,
        externalId: externalId || undefined,
      }).unwrap();
      if (!result.found || !result.post) {
        setLookupResult(null);
        toast({
          title: t('lookup.notFoundTitle'),
          description: t('lookup.notFoundDescription'),
          variant: 'destructive',
        });
        return;
      }
      setLookupResult(result.post);
      toast({
        title: t('lookup.successTitle'),
        description: result.post.title ?? t('placeholders.untitled'),
      });
    } catch (error) {
      console.error(error);
      toast({
        title: t('toast.errorTitle'),
        description: t('toast.errorDescription'),
        variant: 'destructive',
      });
    }
  };

  const submit = async () => {
    if (mode === 'create' && !lookupResult) {
      toast({
        title: t('lookup.notFoundTitle'),
        description: t('lookup.notFoundDescription'),
        variant: 'destructive',
      });
      return;
    }

    try {
      if (mode === 'edit' && itemId) {
        await updateItem({
          id: itemId,
          body: {
            sortOrder: normalizedSortOrder,
            isActive: form.isActive,
          },
        }).unwrap();
        toast({ title: t('toast.updatedTitle'), description: t('toast.updatedDescription') });
      } else if (lookupResult) {
        await createItem({
          code: lookupResult.code ?? undefined,
          externalId: lookupResult.externalId ?? undefined,
          sortOrder: normalizedSortOrder,
          isActive: form.isActive,
        }).unwrap();
        toast({ title: t('toast.createdTitle'), description: t('toast.createdDescription') });
      }
      router.push('/admin/featured-posts');
      router.refresh();
    } catch (error) {
      console.error(error);
      toast({
        title: t('toast.errorTitle'),
        description: t('toast.errorDescription'),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
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
              <label className="text-sm font-medium text-foreground">{t('fields.code')}</label>
              <Input
                value={form.codeInput}
                onChange={(event) => setForm((prev) => ({ ...prev, codeInput: event.target.value }))}
                placeholder={t('fields.codePlaceholder')}
                disabled={mode === 'edit'}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t('fields.externalId')}</label>
              <Input
                value={form.externalIdInput}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, externalIdInput: event.target.value }))
                }
                placeholder={t('fields.externalIdPlaceholder')}
                disabled={mode === 'edit'}
              />
            </div>
            {mode === 'create' ? (
              <div className="md:col-span-2">
                <Button type="button" variant="outline" size="sm" onClick={handleLookup} disabled={busy}>
                  {isLookingUp ? (
                    <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                  ) : (
                    <Search className="mr-2 size-4" aria-hidden />
                  )}
                  {t('actions.lookup')}
                </Button>
              </div>
            ) : null}
          </div>

          {lookupResult ? (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
              <Card className="border-border/60 bg-muted/30">
                <CardContent className="space-y-2 p-4 text-sm">
                  <p className="font-medium text-foreground">{t('lookup.title')}</p>
                  <p className="text-foreground">
                    {lookupResult.title ?? t('placeholders.untitled')}
                  </p>
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span>
                      {t('fields.code')}: {lookupResult.code ?? '-'}
                    </span>
                    <span>
                      {t('fields.externalId')}: {lookupResult.externalId ?? '-'}
                    </span>
                  </div>
                </CardContent>
              </Card>
              <div className="w-full">
                <PostCard
                  post={lookupResult}
                  t={postT}
                  formatPrice={formatPrice}
                  getRelativeLabel={getRelativeLabel}
                  dateFormatter={dateFormatter}
                  showCategoryBreadcrumb
                />
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
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
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/60 p-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">{t('fields.isActive')}</p>
              <p className="text-xs text-muted-foreground">{t('fields.isActiveHint')}</p>
            </div>
            <Switch
              checked={form.isActive}
              onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isActive: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" onClick={() => router.push('/admin/featured-posts')}>
          <ArrowRight className="mr-2 size-4" aria-hidden />
          {t('actions.back')}
        </Button>
        <Button type="button" onClick={() => void submit()} disabled={busy}>
          {busy ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden /> : <Save className="mr-2 size-4" />}
          {t('actions.save')}
        </Button>
      </div>
    </div>
  );
}
