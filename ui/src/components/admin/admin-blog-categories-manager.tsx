'use client';

import { useMemo, useState } from 'react';
import { Edit3, Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  useCreateAdminBlogCategoryMutation,
  useDeleteAdminBlogCategoryMutation,
  useGetAdminBlogCategoriesQuery,
  useUpdateAdminBlogCategoryMutation,
} from '@/features/api/apiSlice';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import type { BlogCategory } from '@/types/blog';
import { cn } from '@/lib/utils';

type CategoryFormState = {
  name: string;
  slug: string;
  isActive: boolean;
};

export function AdminBlogCategoriesManager() {
  const t = useTranslations('admin.blogCategories');
  const { toast } = useToast();
  const { data: categories = [], isLoading, isFetching, refetch } = useGetAdminBlogCategoriesQuery();
  const [createCategory, { isLoading: isCreating }] = useCreateAdminBlogCategoryMutation();
  const [updateCategory, { isLoading: isUpdating }] = useUpdateAdminBlogCategoryMutation();
  const [deleteCategory, { isLoading: isDeleting }] = useDeleteAdminBlogCategoryMutation();

  const [createOpen, setCreateOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<BlogCategory | null>(null);
  const [form, setForm] = useState<CategoryFormState>({
    name: '',
    slug: '',
    isActive: true,
  });

  const busy = isLoading || isFetching;

  const sorted = useMemo(
    () => [...categories].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)),
    [categories],
  );

  const resetForm = () =>
    setForm({
      name: '',
      slug: '',
      isActive: true,
    });

  const openCreate = () => {
    resetForm();
    setCreateOpen(true);
  };

  const openEdit = (category: BlogCategory) => {
    setForm({
      name: category.name,
      slug: category.slug,
      isActive: category.isActive,
    });
    setEditCategory(category);
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
      await createCategory({
        name: form.name,
        slug: form.slug || undefined,
        isActive: form.isActive,
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
    if (!editCategory) return;
    try {
      await updateCategory({
        id: editCategory.id,
        body: {
          name: form.name,
          slug: form.slug || undefined,
          isActive: form.isActive,
        },
      }).unwrap();
      toast({ title: t('toast.updatedTitle'), description: t('toast.updatedDescription') });
      setEditCategory(null);
    } catch (error) {
      toast({
        title: t('toast.errorTitle'),
        description: t('toast.errorDescription'),
        variant: 'destructive',
      });
      console.error(error);
    }
  };

  const handleDelete = async (category: BlogCategory) => {
    const confirmed = window.confirm(t('confirmDelete'));
    if (!confirmed) {
      return;
    }
    try {
      await deleteCategory(category.id).unwrap();
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
                <th className="py-3 pr-4 font-medium text-muted-foreground">{t('columns.active')}</th>
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
                sorted.map((category) => (
                  <tr key={category.id} className="border-b border-border/60 last:border-b-0">
                    <td className="py-3 pr-4 font-medium text-foreground">{category.name}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{category.slug}</td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {category.isActive ? t('status.active') : t('status.inactive')}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">{formatDate(category.updatedAt)}</td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => openEdit(category)}>
                          <Edit3 className="mr-2 size-4" aria-hidden />
                          {t('actions.edit')}
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => void handleDelete(category)}
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
            <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
              <span className="text-sm font-medium text-foreground">{t('fields.active')}</span>
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isActive: checked }))}
              />
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

      <Dialog open={Boolean(editCategory)} onOpenChange={(open) => (!open ? setEditCategory(null) : null)}>
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
            <div className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
              <span className="text-sm font-medium text-foreground">{t('fields.active')}</span>
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isActive: checked }))}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setEditCategory(null)}>
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
