'use client';

import { useMemo, useState } from 'react';
import { Edit3, Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  useCreateAdminBlogTagMutation,
  useDeleteAdminBlogTagMutation,
  useGetAdminBlogTagsQuery,
  useUpdateAdminBlogTagMutation,
} from '@/features/api/apiSlice';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import type { BlogTag } from '@/types/blog';
import { cn } from '@/lib/utils';

type TagFormState = {
  name: string;
  slug: string;
};

export function AdminBlogTagsManager() {
  const t = useTranslations('admin.blogTags');
  const { toast } = useToast();
  const { data: tags = [], isLoading, isFetching, refetch } = useGetAdminBlogTagsQuery();
  const [createTag, { isLoading: isCreating }] = useCreateAdminBlogTagMutation();
  const [updateTag, { isLoading: isUpdating }] = useUpdateAdminBlogTagMutation();
  const [deleteTag, { isLoading: isDeleting }] = useDeleteAdminBlogTagMutation();

  const [createOpen, setCreateOpen] = useState(false);
  const [editTag, setEditTag] = useState<BlogTag | null>(null);
  const [form, setForm] = useState<TagFormState>({ name: '', slug: '' });

  const busy = isLoading || isFetching;
  const sorted = useMemo(
    () => [...tags].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)),
    [tags],
  );

  const resetForm = () => setForm({ name: '', slug: '' });

  const openCreate = () => {
    resetForm();
    setCreateOpen(true);
  };

  const openEdit = (tag: BlogTag) => {
    setForm({ name: tag.name, slug: tag.slug });
    setEditTag(tag);
  };

  const submitCreate = async () => {
    if (!form.name.trim()) {
      toast({
        title: t('toast.missingTitle'),
        description: t('toast.missingDescription'),
        variant: 'destructive',
      });
      return;
    }
    try {
      await createTag({ name: form.name, slug: form.slug || undefined }).unwrap();
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
    if (!editTag) return;
    try {
      await updateTag({
        id: editTag.id,
        body: { name: form.name, slug: form.slug || undefined },
      }).unwrap();
      toast({ title: t('toast.updatedTitle'), description: t('toast.updatedDescription') });
      setEditTag(null);
    } catch (error) {
      toast({
        title: t('toast.errorTitle'),
        description: t('toast.errorDescription'),
        variant: 'destructive',
      });
      console.error(error);
    }
  };

  const handleDelete = async (tag: BlogTag) => {
    const confirmed = window.confirm(t('confirmDelete'));
    if (!confirmed) return;
    try {
      await deleteTag(tag.id).unwrap();
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
                <th className="py-3 pr-4 font-medium text-muted-foreground">{t('columns.name')}</th>
                <th className="py-3 pr-4 font-medium text-muted-foreground">{t('columns.slug')}</th>
                <th className="py-3 pr-4 font-medium text-muted-foreground">{t('columns.updated')}</th>
                <th className="py-3 pr-4 font-medium text-muted-foreground">{t('columns.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {busy ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      <span>{t('loading')}</span>
                    </div>
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-muted-foreground">
                    {t('empty')}
                  </td>
                </tr>
              ) : (
                sorted.map((tag) => (
                  <tr key={tag.id} className="border-b border-border/60 last:border-b-0">
                    <td className="py-3 pr-4 font-medium text-foreground">{tag.name}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{tag.slug}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{formatDate(tag.updatedAt)}</td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => openEdit(tag)}>
                          <Edit3 className="mr-2 size-4" aria-hidden />
                          {t('actions.edit')}
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => void handleDelete(tag)}
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('dialog.addTitle')}</DialogTitle>
            <DialogDescription>{t('dialog.addDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder={t('fields.name')}
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
            <Input
              placeholder={t('fields.slug')}
              value={form.slug}
              onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
            />
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

      <Dialog open={Boolean(editTag)} onOpenChange={(open) => (!open ? setEditTag(null) : null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('dialog.editTitle')}</DialogTitle>
            <DialogDescription>{t('dialog.editDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder={t('fields.name')}
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
            <Input
              placeholder={t('fields.slug')}
              value={form.slug}
              onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
            />
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setEditTag(null)}>
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
