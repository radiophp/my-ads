'use client';

import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Save } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useGetAdminSeoSettingsQuery, useUpdateAdminSeoSettingMutation } from '@/features/api/apiSlice';
import type { SeoPageKey } from '@/types/seo-settings';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

type SeoDraft = {
  title: string;
  description: string;
  keywords: string;
};

const PAGE_KEYS: SeoPageKey[] = ['home', 'news-list', 'blog-list', 'about', 'dashboard'];

const emptyDraft: SeoDraft = {
  title: '',
  description: '',
  keywords: '',
};

export function AdminSeoSettingsManager() {
  const t = useTranslations('admin.seoSettings');
  const { toast } = useToast();
  const { data, isLoading, isFetching, refetch } = useGetAdminSeoSettingsQuery();
  const [updateSetting, { isLoading: isSaving }] = useUpdateAdminSeoSettingMutation();
  const [drafts, setDrafts] = useState<Record<SeoPageKey, SeoDraft>>(() =>
    PAGE_KEYS.reduce(
      (acc, key) => ({
        ...acc,
        [key]: { ...emptyDraft },
      }),
      {} as Record<SeoPageKey, SeoDraft>,
    ),
  );
  const [savingKey, setSavingKey] = useState<SeoPageKey | null>(null);

  useEffect(() => {
    if (!data) return;
    setDrafts((current) => {
      const next = { ...current };
      PAGE_KEYS.forEach((pageKey) => {
        const record = data.find((item) => item.pageKey === pageKey);
        next[pageKey] = {
          title: record?.title ?? '',
          description: record?.description ?? '',
          keywords: record?.keywords ?? '',
        };
      });
      return next;
    });
  }, [data]);

  const pageLabels = useMemo<Record<SeoPageKey, string>>(
    () => ({
      home: t('pages.home'),
      'news-list': t('pages.newsList'),
      'blog-list': t('pages.blogList'),
      about: t('pages.about'),
      dashboard: t('pages.dashboard'),
    }),
    [t],
  );

  const updateField = (pageKey: SeoPageKey, field: keyof SeoDraft, value: string) => {
    setDrafts((current) => ({
      ...current,
      [pageKey]: {
        ...current[pageKey],
        [field]: value,
      },
    }));
  };

  const handleSave = async (pageKey: SeoPageKey) => {
    try {
      setSavingKey(pageKey);
      await updateSetting({
        pageKey,
        body: {
          title: drafts[pageKey]?.title ?? '',
          description: drafts[pageKey]?.description ?? '',
          keywords: drafts[pageKey]?.keywords ?? '',
        },
      }).unwrap();
      toast({
        title: t('toast.savedTitle'),
        description: t('toast.savedDescription'),
      });
    } catch (error) {
      toast({
        title: t('toast.errorTitle'),
        description: t('toast.errorDescription'),
        variant: 'destructive',
      });
      console.error(error);
    } finally {
      setSavingKey(null);
    }
  };

  const busy = isLoading || isFetching;

  return (
    <div className="flex w-full flex-col gap-6 px-4 py-8">
      <Card className="border-border/70">
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{t('title')}</CardTitle>
            <CardDescription>{t('description')}</CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            disabled={busy}
          >
            <RefreshCw className={cn('mr-2 size-4', busy && 'animate-spin')} aria-hidden />
            {t('actions.refresh')}
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {PAGE_KEYS.map((pageKey) => {
            const draft = drafts[pageKey] ?? emptyDraft;
            const saving = savingKey === pageKey;
            return (
              <div key={pageKey} className="rounded-xl border border-border/60 p-4">
                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-semibold text-foreground">{pageLabels[pageKey]}</h3>
                  <p className="text-xs text-muted-foreground">{t('fields.helper')}</p>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      {t('fields.title')}
                    </label>
                    <Input
                      value={draft.title}
                      onChange={(event) => updateField(pageKey, 'title', event.target.value)}
                      placeholder={t('fields.titlePlaceholder')}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      {t('fields.description')}
                    </label>
                    <Textarea
                      value={draft.description}
                      onChange={(event) => updateField(pageKey, 'description', event.target.value)}
                      placeholder={t('fields.descriptionPlaceholder')}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      {t('fields.keywords')}
                    </label>
                    <Input
                      value={draft.keywords}
                      onChange={(event) => updateField(pageKey, 'keywords', event.target.value)}
                      placeholder={t('fields.keywordsPlaceholder')}
                    />
                    <p className="text-xs text-muted-foreground">{t('fields.keywordsHint')}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void handleSave(pageKey)}
                    disabled={isSaving && savingKey !== pageKey}
                  >
                    <Save className={cn('mr-2 size-4', saving && 'animate-pulse')} aria-hidden />
                    {saving ? t('actions.saving') : t('actions.save')}
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
