'use client';

import { useMemo, useState } from 'react';
import { Edit3, Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  useCreateAdminNewsMutation,
  useDeleteAdminNewsMutation,
  useGetAdminNewsCategoriesQuery,
  useGetAdminNewsQuery,
  useGetAdminNewsTagsQuery,
  useUpdateAdminNewsMutation,
} from '@/features/api/apiSlice';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import type { NewsItem, NewsCategory, NewsTag } from '@/types/news';
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

export function AdminNewsManager() {
  const t = useTranslations('admin.news');
  const { toast } = useToast();
  const { data: items = [], isLoading, isFetching, refetch } = useGetAdminNewsQuery();
  const { data: categories = [] } = useGetAdminNewsCategoriesQuery();
  const { data: tags = [] } = useGetAdminNewsTagsQuery();
  const [createNews, { isLoading: isCreating }] = useCreateAdminNewsMutation();
  const [updateNews, { isLoading: isUpdating }] = useUpdateAdminNewsMutation();
  const [deleteNews, { isLoading: isDeleting }] = useDeleteAdminNewsMutation();

  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<NewsItem | null>(null);
  const [form, setForm] = useState<NewsFormState>({
    title: '',
    slug: '',
    shortText: '',
    content: '',
    mainImageUrl: '',
    categoryId: '',
    tagIds: [],
  });

  const busy = isLoading || isFetching;

  const sorted = useMemo(
    () => [...items].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)),
    [items],
  );

  const categoryLookup = useMemo(() => {
    const map = new Map<string, NewsCategory>();
    categories.forEach((category) => map.set(category.id, category));
    return map;
  }, [categories]);

  const tagLookup = useMemo(() => {
    const map = new Map<string, NewsTag>();
    tags.forEach((tag) => map.set(tag.id, tag));
    return map;
  }, [tags]);

  const resetForm = () =>
    setForm({
      title: '',
      slug: '',
      shortText: '',
      content: '',
      mainImageUrl: '',
      categoryId: categories[0]?.id ?? '',
      tagIds: [],
    });

  const openCreate = () => {
    resetForm();
    setCreateOpen(true);
  };

  const openEdit = (item: NewsItem) => {
    setForm({
      title: item.title,
      slug: item.slug,
      shortText: item.shortText ?? '',
      content: item.content ?? '',
      mainImageUrl: item.mainImageUrl ?? '',
      categoryId: item.category?.id ?? '',
      tagIds: item.tags.map((tag) => tag.id),
    });
    setEditItem(item);
  };

  const toggleTag = (tagId: string) => {
    setForm((prev) => {
      const exists = prev.tagIds.includes(tagId);
      return {
        ...prev,
        tagIds: exists ? prev.tagIds.filter((id) => id !== tagId) : [...prev.tagIds, tagId],
      };
    });
  };

  const submitCreate = async () => {
    if (!form.title.trim() || !form.content.trim() || !form.categoryId) {
      toast({
        title: t('toast.missingTitle'),
        description: t('toast.missingDescription'),
        variant: 'destructive',
      });
      return;
    }
    try {
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
      setCreateOpen(false);
      resetForm();
    } catch (error) {
      toast({
        title: t('toast.errorTitle'),
        description: t('toast.errorDescription'),
        variant: 'destructive',
      });
      console.error(error);
    }
  };

  const submitUpdate = async () => {
    if (!editItem) return;
    try {
      await updateNews({
        id: editItem.id,
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
      setEditItem(null);
    } catch (error) {
      toast({
        title: t('toast.errorTitle'),
        description: t('toast.errorDescription'),
        variant: 'destructive',
      });
      console.error(error);
    }
  };

  const handleDelete = async (item: NewsItem) => {
    const confirmed = window.confirm(t('confirmDelete'));
    if (!confirmed) return;
    try {
      await deleteNews(item.id).unwrap();
      toast({ title: t('toast.deletedTitle'), description: t('toast.deletedDescription') });
    } catch (error) {
      toast({
        title: t('toast.errorTitle'),
        description: t('toast.errorDescription'),
        variant: 'destructive',
      });
      console.error(error);
    }
  };

  const formatDate = (value: string) =>
    new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <div className="flex w-full flex-col gap-6 px-4 py-8">
      <Card className="border-border/70">
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{t('title')}</CardTitle>
            <CardDescription>{t('description')}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => void refetch()} disabled={busy}>
              <RefreshCw className={cn('mr-2 size-4', busy && 'animate-spin')} aria-hidden />
              {t('actions.refresh')}
            </Button>
            <Button type="button" size="sm" onClick={openCreate}>
              <Plus className="mr-2 size-4" aria-hidden />
              {t('actions.add')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/70 text-left rtl:text-right">
                <th className="py-3 pr-4 font-medium text-muted-foreground">{t('columns.title')}</th>
                <th className="py-3 pr-4 font-medium text-muted-foreground">{t('columns.category')}</th>
                <th className="py-3 pr-4 font-medium text-muted-foreground">{t('columns.tags')}</th>
                <th className="py-3 pr-4 font-medium text-muted-foreground">{t('columns.updated')}</th>
                <th className="py-3 pr-4 font-medium text-muted-foreground">{t('columns.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {busy ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      <span>{t('loading')}</span>
                    </div>
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-muted-foreground">
                    {t('empty')}
                  </td>
                </tr>
              ) : (
                sorted.map((item) => (
                  <tr key={item.id} className="border-b border-border/60 last:border-b-0">
                    <td className="py-3 pr-4 font-medium text-foreground">{item.title}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{item.category?.name ?? '—'}</td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {item.tags.length === 0
                        ? t('tags.empty')
                        : item.tags.map((tag) => tag.name).join('، ')}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">{formatDate(item.updatedAt)}</td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => openEdit(item)}>
                          <Edit3 className="mr-2 size-4" aria-hidden />
                          {t('actions.edit')}
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => void handleDelete(item)}
                          disabled={isDeleting}
                        >
                          <Trash2 className="mr-2 size-4" aria-hidden />
                          {t('actions.delete')}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('dialog.addTitle')}</DialogTitle>
            <DialogDescription>{t('dialog.addDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder={t('fields.title')}
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            />
            <Input
              placeholder={t('fields.slug')}
              value={form.slug}
              onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
            />
            <Textarea
              placeholder={t('fields.shortText')}
              value={form.shortText}
              onChange={(event) => setForm((prev) => ({ ...prev, shortText: event.target.value }))}
              rows={3}
            />
            <Textarea
              placeholder={t('fields.content')}
              value={form.content}
              onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
              rows={6}
            />
            <Input
              placeholder={t('fields.mainImageUrl')}
              value={form.mainImageUrl}
              onChange={(event) => setForm((prev) => ({ ...prev, mainImageUrl: event.target.value }))}
            />
            <label className="flex flex-col gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{t('fields.category')}</span>
              <select
                value={form.categoryId}
                onChange={(event) => setForm((prev) => ({ ...prev, categoryId: event.target.value }))}
                className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">{t('fields.categoryPlaceholder')}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">{t('fields.tags')}</p>
              <div className="flex flex-wrap gap-2">
                {tags.length === 0 ? (
                  <span className="text-sm text-muted-foreground">{t('tags.empty')}</span>
                ) : (
                  tags.map((tag) => {
                    const active = form.tagIds.includes(tag.id);
                    return (
                      <Button
                        key={tag.id}
                        type="button"
                        variant={active ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleTag(tag.id)}
                      >
                        {tag.name}
                      </Button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {t('actions.cancel')}
            </Button>
            <Button onClick={submitCreate} disabled={isCreating}>
              {t('actions.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editItem)} onOpenChange={(open) => (!open ? setEditItem(null) : null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('dialog.editTitle')}</DialogTitle>
            <DialogDescription>{t('dialog.editDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder={t('fields.title')}
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            />
            <Input
              placeholder={t('fields.slug')}
              value={form.slug}
              onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
            />
            <Textarea
              placeholder={t('fields.shortText')}
              value={form.shortText}
              onChange={(event) => setForm((prev) => ({ ...prev, shortText: event.target.value }))}
              rows={3}
            />
            <Textarea
              placeholder={t('fields.content')}
              value={form.content}
              onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
              rows={6}
            />
            <Input
              placeholder={t('fields.mainImageUrl')}
              value={form.mainImageUrl}
              onChange={(event) => setForm((prev) => ({ ...prev, mainImageUrl: event.target.value }))}
            />
            <label className="flex flex-col gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{t('fields.category')}</span>
              <select
                value={form.categoryId}
                onChange={(event) => setForm((prev) => ({ ...prev, categoryId: event.target.value }))}
                className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">{t('fields.categoryPlaceholder')}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">{t('fields.tags')}</p>
              <div className="flex flex-wrap gap-2">
                {tags.length === 0 ? (
                  <span className="text-sm text-muted-foreground">{t('tags.empty')}</span>
                ) : (
                  tags.map((tag) => {
                    const active = form.tagIds.includes(tag.id);
                    return (
                      <Button
                        key={tag.id}
                        type="button"
                        variant={active ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleTag(tag.id)}
                      >
                        {tag.name}
                      </Button>
                    );
                  })
                )}
              </div>
            </div>
            {form.categoryId && categoryLookup.has(form.categoryId) ? (
              <p className="text-xs text-muted-foreground">
                {t('fields.categoryPreview', { name: categoryLookup.get(form.categoryId)?.name })}
              </p>
            ) : null}
            {form.tagIds.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                {t('fields.tagsPreview', {
                  count: form.tagIds.length,
                  names: form.tagIds
                    .map((tagId) => tagLookup.get(tagId)?.name)
                    .filter(Boolean)
                    .join('، '),
                })}
              </p>
            ) : null}
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setEditItem(null)}>
              {t('actions.cancel')}
            </Button>
            <Button onClick={submitUpdate} disabled={isUpdating}>
              {t('actions.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
