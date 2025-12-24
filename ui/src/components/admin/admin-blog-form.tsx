'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, Save } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  useCreateAdminBlogMutation,
  useGetAdminBlogCategoriesQuery,
  useGetAdminBlogItemQuery,
  useGetAdminBlogTagsQuery,
  useUpdateAdminBlogMutation,
} from '@/features/api/apiSlice';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { RichTextEditor } from '@/components/editor/rich-text-editor';
import { BlogImageUploader } from '@/components/admin/blog-image-uploader';
import type { BlogCategory, BlogTag } from '@/types/blog';
import { cn } from '@/lib/utils';

type BlogFormState = {
  title: string;
  slug: string;
  shortText: string;
  content: string;
  mainImageUrl: string;
  categoryId: string;
  tagIds: string[];
};

type AdminBlogFormProps = {
  mode: 'create' | 'edit';
  blogId?: string;
};

const emptyForm: BlogFormState = {
  title: '',
  slug: '',
  shortText: '',
  content: '',
  mainImageUrl: '',
  categoryId: '',
  tagIds: [],
};

export function AdminBlogForm({ mode, blogId }: AdminBlogFormProps) {
  const t = useTranslations('admin.blog');
  const router = useRouter();
  const { toast } = useToast();
  const { data: categories = [] } = useGetAdminBlogCategoriesQuery();
  const { data: tags = [] } = useGetAdminBlogTagsQuery();
  const [createBlog, { isLoading: isCreating }] = useCreateAdminBlogMutation();
  const [updateBlog, { isLoading: isUpdating }] = useUpdateAdminBlogMutation();
  const {
    data: blogItem,
    isLoading: isLoadingItem,
    isFetching: isFetchingItem,
  } = useGetAdminBlogItemQuery(blogId!, { skip: mode !== 'edit' || !blogId });

  const [form, setForm] = useState<BlogFormState>(() => ({
    ...emptyForm,
    categoryId: categories[0]?.id ?? '',
  }));
  const [prefillKey, setPrefillKey] = useState<string | null>(null);
  const [editorKey, setEditorKey] = useState(() => (mode === 'edit' ? blogId ?? 'edit' : 'create'));
  const [editorInitialHtml, setEditorInitialHtml] = useState('');
  const editorInstanceKey = useMemo(
    () => `${editorKey}-${editorInitialHtml ? editorInitialHtml.length : 0}`,
    [editorInitialHtml, editorKey],
  );

  const loading = isLoadingItem || isFetchingItem;
  const busy = isCreating || isUpdating || loading;

  useEffect(() => {
    setPrefillKey(null);
    setEditorInitialHtml('');
    setEditorKey(mode === 'edit' ? blogId ?? 'edit' : 'create');
    setForm({
      ...emptyForm,
      categoryId: '',
    });
  }, [blogId, mode]);

  useEffect(() => {
    if (mode === 'edit' && blogItem) {
      if (prefillKey === blogItem.id) {
        return;
      }
      setForm({
        title: blogItem.title,
        slug: blogItem.slug,
        shortText: blogItem.shortText ?? '',
        content: blogItem.content ?? '',
        mainImageUrl: blogItem.mainImageUrl ?? '',
        categoryId: blogItem.category?.id ?? '',
        tagIds: blogItem.tags.map((tag) => tag.id),
      });
      setEditorInitialHtml(blogItem.content ?? '');
      setEditorKey(blogItem.id);
      setPrefillKey(blogItem.id);
      return;
    }

    if (mode === 'create') {
      if (prefillKey === 'create' || categories.length === 0) {
        return;
      }
      if (categories.length > 0) {
        setForm((prev) => ({
          ...prev,
          categoryId: prev.categoryId || categories[0]?.id || '',
        }));
        setPrefillKey('create');
      }
    }
  }, [blogItem, categories, mode, prefillKey]);

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
      if (mode === 'edit' && blogId) {
        await updateBlog({
          id: blogId,
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
        await createBlog({
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

      router.push('/admin/blog');
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
              <BlogImageUploader
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
                {categories.map((category: BlogCategory) => (
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
                {tags.map((tag: BlogTag) => {
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
            onClick={() => router.push('/admin/blog')}
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
