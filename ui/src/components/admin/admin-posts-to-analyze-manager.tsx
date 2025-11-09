'use client';

import { useMemo, useState } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useGetPostsToAnalyzeQuery } from '@/features/api/apiSlice';
import type { PostToAnalyze } from '@/types/divar-posts';

export function AdminPostsToAnalyzeManager() {
  const t = useTranslations('admin.postsToAnalyze');
  const [page, setPage] = useState(1);
  const [selectedPost, setSelectedPost] = useState<PostToAnalyze | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewPost, setPreviewPost] = useState<PostToAnalyze | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const { data, isLoading, isFetching } = useGetPostsToAnalyzeQuery(page);
  const posts = data?.items ?? [];
  const meta = data?.meta;

  const isBusy = isLoading || isFetching;

  const statusLabels = useMemo(
    () => ({
      PENDING: t('status.pending'),
      PROCESSING: t('status.processing'),
      COMPLETED: t('status.completed'),
      FAILED: t('status.failed'),
    }),
    [t],
  );

  const formatDate = (value: string): string => {
    try {
      return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(new Date(value));
    } catch {
      return value;
    }
  };

  const handleViewPayload = (post: PostToAnalyze) => {
    setSelectedPost(post);
    setDialogOpen(true);
  };

  const handlePreviewPost = (post: PostToAnalyze) => {
    setPreviewPost(post);
    setPreviewOpen(true);
  };

  const handleCloseDialog = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedPost(null);
    }
  };

  const handleClosePreview = (open: boolean) => {
    setPreviewOpen(open);
    if (!open) {
      setPreviewPost(null);
    }
  };

  const handlePrevPage = () => {
    if (meta?.hasPreviousPage && page > 1) {
      setPage((current) => current - 1);
    }
  };

  const handleNextPage = () => {
    if (meta?.hasNextPage) {
      setPage((current) => current + 1);
    }
  };

  const paginationLabel = meta
    ? t('pagination.label', {
        page: meta.page,
        totalPages: Math.max(meta.totalPages, meta.page),
        totalItems: meta.totalItems,
      })
    : '';

  return (
    <div className="flex w-full flex-col gap-6 px-4 py-8">
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/70 text-left rtl:text-right text-xs uppercase text-muted-foreground">
                <th className="py-3 pr-4 font-medium">{t('columns.title')}</th>
                <th className="py-3 pr-4 font-medium">{t('columns.externalId')}</th>
                <th className="py-3 pr-4 font-medium">{t('columns.link')}</th>
                <th className="py-3 pr-4 font-medium">{t('columns.status')}</th>
                <th className="py-3 pr-4 font-medium">{t('columns.createdAt')}</th>
                <th className="py-3 pr-4 font-medium text-right">{t('columns.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {isBusy ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      <span>{t('loading')}</span>
                    </div>
                  </td>
                </tr>
              ) : posts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-muted-foreground">
                    {t('empty')}
                  </td>
                </tr>
              ) : (
                posts.map((post) => {
                  const link = `https://divar.ir/v/${post.externalId}`;
                  const title = post.seoTitle ?? t('untitled', { externalId: post.externalId });
                  return (
                    <tr key={post.id} className="border-b border-border/50 last:border-b-0">
                      <td className="py-3 pr-4 font-medium text-foreground">{title}</td>
                      <td className="py-3 pr-4 font-mono text-sm text-muted-foreground">
                        {post.externalId}
                      </td>
                      <td className="py-3 pr-4">
                        <a
                          href={link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
                        >
                          {t('actions.openOnDivar')}
                          <ExternalLink className="size-3" aria-hidden />
                        </a>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="rounded-full bg-muted px-2 py-1 text-xs font-semibold text-foreground">
                          {statusLabels[post.status]}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">{formatDate(post.createdAt)}</td>
                      <td className="py-3 pr-4 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-xs font-medium text-primary hover:text-primary"
                          onClick={() => handleViewPayload(post)}
                        >
                          {t('actions.viewPayload')}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-xs font-medium text-primary hover:text-primary"
                          onClick={() => handlePreviewPost(post)}
                        >
                          {t('actions.preview')}
                        </Button>
                      </td>
                    </tr>
                  );
                })
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
                disabled={!meta?.hasPreviousPage || isBusy || page === 1}
                onClick={handlePrevPage}
              >
                {t('pagination.previous')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!meta?.hasNextPage || isBusy}
                onClick={handleNextPage}
              >
                {t('pagination.next')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedPost?.seoTitle ?? t('dialog.titleFallback')}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {selectedPost ? t('dialog.description', { externalId: selectedPost.externalId }) : null}
            </DialogDescription>
          </DialogHeader>
          {selectedPost ? (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">{t('columns.externalId')}:</span>{' '}
                  {selectedPost.externalId}
                </p>
                <p>
                  <span className="font-medium text-foreground">{t('columns.status')}:</span>{' '}
                  {statusLabels[selectedPost.status]}
                </p>
                <p>
                  <span className="font-medium text-foreground">{t('columns.createdAt')}:</span>{' '}
                  {formatDate(selectedPost.createdAt)}
                </p>
              </div>
              <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-lg border border-dashed border-border bg-muted/40 p-4 text-xs text-foreground" dir="ltr">
                {JSON.stringify(selectedPost.payload, null, 2)}
              </pre>
            </div>
          ) : (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={handleClosePreview}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>{t('preview.title')}</DialogTitle>
            <DialogDescription>
              {previewPost
                ? t('preview.description', { externalId: previewPost.externalId })
                : null}
            </DialogDescription>
          </DialogHeader>
          {previewPost ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-border/70">
                <iframe
                  title={previewPost.externalId}
                  src={`https://divar.ir/v/${previewPost.externalId}`}
                  className="h-[70vh] w-full rounded-lg"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {t('preview.note')}
              </p>
              <div className="flex justify-end">
                <Button asChild variant="outline" size="sm">
                  <a href={`https://divar.ir/v/${previewPost.externalId}`} target="_blank" rel="noreferrer">
                    {t('actions.openOnDivar')}
                  </a>
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
