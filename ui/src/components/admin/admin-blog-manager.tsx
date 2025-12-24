'use client';

import { useState } from 'react';
import { Edit3, Loader2, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';

import { useDeleteAdminBlogMutation, useGetAdminBlogQuery } from '@/features/api/apiSlice';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import type { BlogItem } from '@/types/blog';
import { cn } from '@/lib/utils';
import { normalizeStorageUrl } from '@/lib/storage';

export function AdminBlogManager() {
  const router = useRouter();
  const t = useTranslations('admin.blog');
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const { data, isLoading, isFetching, refetch } = useGetAdminBlogQuery({
    page,
    pageSize,
    search: search.trim() ? search.trim() : undefined,
  });
  const items = data?.items ?? [];
  const totalItems = data?.total ?? 0;
  const [deleteBlog, { isLoading: isDeleting }] = useDeleteAdminBlogMutation();

  const busy = isLoading || isFetching;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const hasPreviousPage = page > 1;
  const hasNextPage = page < totalPages;

  const openCreate = () => {
    router.push('/admin/blog/new');
  };

  const applySearch = () => {
    const trimmed = searchInput.trim();
    setSearch(trimmed);
    setPage(1);
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearch('');
    setPage(1);
  };

  const openEdit = (item: BlogItem) => {
    router.push(`/admin/blog/${item.id}`);
  };

  const handleDelete = async (item: BlogItem) => {
    const confirmed = window.confirm(t('confirmDelete'));
    if (!confirmed) return;
    try {
      await deleteBlog(item.id).unwrap();
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

  const paginationLabel = data
    ? t('pagination.label', {
        page,
        totalPages,
        totalItems,
      })
    : '';

  return (
    <div className="flex w-full flex-col gap-6 px-4 py-8">
      <Card className="border-border/70">
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{t('title')}</CardTitle>
            <CardDescription>{t('description')}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    applySearch();
                  }
                }}
                placeholder={t('fields.search')}
                className="h-9 w-full min-w-[200px] pr-9 sm:w-56"
              />
              {searchInput ? (
                <button
                  type="button"
                  onClick={clearSearch}
                  aria-label={t('actions.clearSearch')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                >
                  <X className="size-4" aria-hidden />
                </button>
              ) : null}
            </div>
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
                <th className="py-3 pr-4 font-medium text-muted-foreground">{t('columns.thumbnail')}</th>
                <th className="py-3 pr-4 font-medium text-muted-foreground">{t('columns.title')}</th>
                <th className="py-3 pr-4 font-medium text-muted-foreground">{t('columns.category')}</th>
                <th className="py-3 pr-4 font-medium text-muted-foreground">{t('columns.source')}</th>
                <th className="py-3 pr-4 font-medium text-muted-foreground">{t('columns.updated')}</th>
                <th className="py-3 pr-4 font-medium text-muted-foreground">{t('columns.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {busy ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      <span>{t('loading')}</span>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-muted-foreground">
                    {t('empty')}
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="border-b border-border/60 last:border-b-0">
                    <td className="py-3 pr-4">
                      <div className="relative h-12 w-16 overflow-hidden rounded-md bg-muted/50">
                        {item.mainImageUrl ? (
                          <Image
                            src={normalizeStorageUrl(item.mainImageUrl) ?? item.mainImageUrl}
                            alt=""
                            fill
                            sizes="64px"
                            unoptimized
                            className="object-cover"
                          />
                        ) : null}
                      </div>
                    </td>
                    <td className="py-3 pr-4 font-medium text-foreground">
                      {item.slug ? (
                        <Link
                          href={`/blog/${item.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          {item.title}
                        </Link>
                      ) : (
                        item.title
                      )}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">{item.category?.name ?? '—'}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{item.source?.name ?? '—'}</td>
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
          <div className="mt-6 flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>{paginationLabel}</p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!hasPreviousPage || busy}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                {t('pagination.previous')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!hasNextPage || busy}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              >
                {t('pagination.next')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
