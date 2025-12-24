'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, Save } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  useCreateAdminNewsMutation,
  useGetAdminNewsCategoriesQuery,
  useGetAdminNewsItemQuery,
  useGetAdminNewsTagsQuery,
  useUpdateAdminNewsMutation,
} from '@/features/api/apiSlice';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { RichTextEditor } from '@/components/editor/rich-text-editor';
import { NewsImageUploader } from '@/components/admin/news-image-uploader';
import type { NewsCategory, NewsTag } from '@/types/news';
import { cn } from '@/lib/utils';

type NewsFormState = {
  title: string;
  slug: string;
  shortText: string;
  content: string;
  mainImageUrl: string;
  categoryId: string;
  tagIds: string[];
};

type AdminNewsFormProps = {
  mode: 'create' | 'edit';
  newsId?: string;
};

const emptyForm: NewsFormState = {
  title: '',
  slug: '',
  shortText: '',
  content: '',
  mainImageUrl: '',
  categoryId: '',
  tagIds: [],
};

export function AdminNewsForm({ mode, newsId }: AdminNewsFormProps) {
  const t = useTranslations('admin.news');
  const router = useRouter();
  const { toast } = useToast();
  const { data: categories = [] } = useGetAdminNewsCategoriesQuery();
  const { data: tags = [] } = useGetAdminNewsTagsQuery();
  const [createNews, { isLoading: isCreating }] = useCreateAdminNewsMutation();
  const [updateNews, { isLoading: isUpdating }] = useUpdateAdminNewsMutation();
  const {
    data: newsItem,
    isLoading: isLoadingItem,
    isFetching: isFetchingItem,
  } = useGetAdminNewsItemQuery(newsId!, { skip: mode !== 'edit' || !newsId });

  const [form, setForm] = useState<NewsFormState>(() => ({
    ...emptyForm,
    categoryId: categories[0]?.id ?? '',
  }));
  const [didPrefill, setDidPrefill] = useState(false);
  const [editorKey, setEditorKey] = useState(() => (mode === 'edit' ? newsId ?? 'edit' : 'create'));
  const [editorInitialHtml, setEditorInitialHtml] = useState('');
  const editorInstanceKey = useMemo(
    () => `${editorKey}-${editorInitialHtml ? editorInitialHtml.length : 0}`,
    [editorInitialHtml, editorKey],
  );

  const loading = isLoadingItem || isFetchingItem;
  const busy = isCreating || isUpdating || loading;

  useEffect(() => {
    setDidPrefill(false);
    setEditorInitialHtml('');
    setEditorKey(mode === 'edit' ? newsId ?? 'edit' : 'create');
    setForm({
      ...emptyForm,
      categoryId: '',
    });
  }, [mode, newsId]);

  useEffect(() => {
    if (mode !== 'edit' || !newsItem || didPrefill) {
      if (mode === 'create' && !didPrefill && categories.length > 0) {
        setForm((prev) => ({
          ...prev,
          categoryId: prev.categoryId || categories[0]?.id || '',
        }));
        setDidPrefill(true);
      }
      return;
    }
    setForm({
      title: newsItem.title,
      slug: newsItem.slug,
      shortText: newsItem.shortText ?? '',
      content: newsItem.content ?? '',
      mainImageUrl: newsItem.mainImageUrl ?? '',
      categoryId: newsItem.category?.id ?? '',
      tagIds: newsItem.tags.map((tag) => tag.id),
    });
    setEditorInitialHtml(newsItem.content ?? '');
    setEditorKey(newsItem.id);
    setDidPrefill(true);
  }, [categories, didPrefill, mode, newsItem]);

  const categoryLookup = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((category) => map.set(category.id, category.name));
    return map;
  }, [categories]);

  const tagLookup = useMemo(() => {
    const map = new Map<string, string>();
    tags.forEach((tag) => map.set(tag.id, tag.name));
    return map;
  }, [tags]);

  const toggleTag = (tagId: string) => {
    setForm((prev) => {
      const exists = prev.tagIds.includes(tagId);
      return {
        ...prev,
        tagIds: exists ? prev.tagIds.filter((id) => id !== tagId) : [...prev.tagIds, tagId],
      };
    });
  };

  const submit = async () => {
    if (!form.title.trim() || !form.content.trim() || !form.categoryId) {
      toast({
        title: t('toast.missingTitle'),
        description: t('toast.missingDescription'),
        variant: 'destructive',
      });
      return;
    }

    try {
      if (mode === 'edit' && newsId) {
        await updateNews({
          id: newsId,
          body: {
            title: form.title,
            slug: form.slug || undefined,
            shortText: form.shortText || undefined,
            content: form.content,
            mainImageUrl: form.mainImageUrl || undefined,
            categoryId: form.categoryId,
            tagIds: form.tagIds,
          },
        }).unwrap();
        toast({ title: t('toast.updatedTitle'), description: t('toast.updatedDescription') });
      } else {
        await createNews({
          title: form.title,
          slug: form.slug || undefined,
          shortText: form.shortText || undefined,
          content: form.content,
          mainImageUrl: form.mainImageUrl || undefined,
          categoryId: form.categoryId,
          tagIds: form.tagIds.length > 0 ? form.tagIds : undefined,
        }).unwrap();
        toast({ title: t('toast.createdTitle'), description: t('toast.createdDescription') });
      }

      router.push('/admin/news');
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

  const headerTitle = mode === 'edit' ? t('form.editTitle') : t('form.createTitle');
  const headerDescription = mode === 'edit' ? t('form.editDescription') : t('form.createDescription');

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-col gap-4">
          <div>
            <CardTitle>{headerTitle}</CardTitle>
            <CardDescription>{headerDescription}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
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
              <label className="text-sm font-medium text-foreground">{t('fields.slug')}</label>
              <Input
                value={form.slug}
                onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
                placeholder={t('fields.slugPlaceholder')}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-foreground">
                {t('fields.shortText')}
              </label>
              <Textarea
                rows={3}
                value={form.shortText}
                onChange={(event) => setForm((prev) => ({ ...prev, shortText: event.target.value }))}
                placeholder={t('fields.shortTextPlaceholder')}
              />
            </div>
            <div className="md:col-span-2">
              <NewsImageUploader
                value={form.mainImageUrl || null}
                onChange={(value) =>
                  setForm((prev) => ({ ...prev, mainImageUrl: value ?? '' }))
                }
                disabled={busy}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-foreground">{t('fields.content')}</label>
              <div className="mx-auto w-full max-w-4xl">
                <RichTextEditor
                  key={editorInstanceKey}
                  initialHtml={editorInitialHtml}
                  onChange={(value) => setForm((prev) => ({ ...prev, content: value }))}
                  placeholder={t('fields.contentPlaceholder')}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {t('fields.category')}
              </label>
              <select
                className="w-full rounded-lg border border-border/70 bg-background px-3 py-2 text-sm"
                value={form.categoryId}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, categoryId: event.target.value }))
                }
              >
                <option value="">{t('fields.categoryPlaceholder')}</option>
                {categories.map((category: NewsCategory) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {form.categoryId && (
                <p className="text-xs text-muted-foreground">
                  {categoryLookup.get(form.categoryId)}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t('fields.tags')}</label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag: NewsTag) => {
                  const isActive = form.tagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs transition',
                        isActive
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border/70 text-muted-foreground hover:border-primary/50',
                      )}
                      onClick={() => toggleTag(tag.id)}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
              {form.tagIds.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {form.tagIds
                    .map((tagId) => tagLookup.get(tagId))
                    .filter(Boolean)
                    .join('، ')}
                </p>
              )}
            </div>
          </div>
        </CardContent>
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/70 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/admin/news')}
          >
            <ArrowRight className="size-4" />
            {t('form.back')}
          </Button>
          <Button type="button" onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {t('form.save')}
          </Button>
        </div>
      </Card>
    </div>
  );
}
