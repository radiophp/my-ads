/* eslint-disable @next/next/no-img-element, tailwindcss/classnames-order */
import type { JSX } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { DivarPostSummary } from '@/types/divar-posts';
import { cn } from '@/lib/utils';
import type { useTranslations } from 'next-intl';
import {
  buildPhotoDownloadUrl,
  getMediaDownloadUrl,
  mapPostMediasToDownloadables,
  resolveMediaAlt,
  sanitizeFileName,
  type DownloadableMedia,
} from './helpers';

type DownloadPhotosDialogProps = {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  post: DivarPostSummary | null;
  isRTL: boolean;
  t: ReturnType<typeof useTranslations>;
};

export function DownloadPhotosDialog({
  open,
  onOpenChange,
  post,
  isRTL,
  t,
}: DownloadPhotosDialogProps): JSX.Element | null {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const medias = useMemo(() => (post ? mapPostMediasToDownloadables(post) : []), [post]);
  const zipDownloadUrl =
    post && post.medias.length > 1 ? buildPhotoDownloadUrl(post.id) : null;

  const hasDownloadableMedia = medias.length > 0;

  const handleSingleDownload = useCallback(
    async (media: DownloadableMedia, index: number) => {
      const downloadUrl = getMediaDownloadUrl(media);
      if (!downloadUrl) {
        return;
      }
      try {
        setDownloadingId(media.id);
        const response = await fetch(downloadUrl);
        if (!response.ok) {
          throw new Error(`Failed to download media: ${response.status}`);
        }
        const blob = await response.blob();
        const objectUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        const rawLabel =
          media.id ??
          (post?.externalId ? `${post.externalId}-${index + 1}` : `photo-${index + 1}`);
        const label = sanitizeFileName(rawLabel);
        const extensionMatch = downloadUrl.match(/\.(jpe?g|png|webp|gif|heic|heif)(?:\?|$)/i);
        const extension = extensionMatch ? extensionMatch[0].split('?')[0] : '.jpg';
        link.href = objectUrl;
        link.download = `${sanitizeFileName(label)}${extension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(objectUrl);
      } catch (error) {
        console.error('Failed to download media', error);
      } finally {
        setDownloadingId(null);
      }
    },
    [post],
  );

  const handleZipDownload = useCallback(() => {
    if (!post || !zipDownloadUrl) {
      return;
    }
    setDownloadingId('zip');
    const link = document.createElement('a');
    link.href = zipDownloadUrl;
    const fallbackId = post.externalId ?? post.id ?? 'post';
    const downloadLabel = post.code ? `${post.code}` : fallbackId;
    link.download = `${sanitizeFileName(downloadLabel)}-photos.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setDownloadingId(null), 3000);
  }, [post, zipDownloadUrl]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogContent
        hideCloseButton
        className="left-0 top-0 h-dvh w-screen max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 pb-[env(safe-area-inset-bottom)] sm:left-1/2 sm:top-1/2 sm:flex sm:h-[90vh] sm:w-full sm:max-w-3xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:flex-col sm:overflow-hidden sm:rounded-2xl sm:p-6"
        onPointerDownOutside={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          <div className="border-b border-border px-6 py-4 sm:hidden">
            <p className="text-center text-base font-semibold">{t('downloadPhotos')}</p>
          </div>
          <div className="hidden px-6 py-4 sm:block">
            <DialogHeader>
              <DialogTitle>{t('downloadPhotos')}</DialogTitle>
            </DialogHeader>
          </div>
          <div className="flex-1 min-h-0 touch-pan-y overflow-y-auto overscroll-contain px-6 pb-4 pt-2 sm:px-6">
            {hasDownloadableMedia ? (
              <div className="grid grid-cols-3 gap-3 md:grid-cols-5 lg:grid-cols-5">
                {medias.map((media, index) => {
                  const downloadUrl = getMediaDownloadUrl(media);
                  const isDownloading = downloadingId === media.id;
                  return (
                    <div key={media.id ?? `download-media-${index}`} className="flex flex-col gap-2">
                      <div className="aspect-[4/3] overflow-hidden rounded-xl border border-border/80">
                        <img
                          src={media.thumbnailUrl ?? media.url ?? ''}
                          alt={resolveMediaAlt(media, post?.title, post?.externalId)}
                          className="size-full object-cover"
                          draggable={false}
                        />
                      </div>
                        {downloadUrl ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isDownloading}
                            className="flex items-center justify-center gap-1 text-xs"
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleSingleDownload(media, index);
                            }}
                          >
                            <Download className="size-4" aria-hidden />
                            <span>
                              {isDownloading ? t('downloadInProgress') : t('downloadSingle')}
                            </span>
                          </Button>
                        ) : (
                          <span className="text-center text-xs text-muted-foreground">
                            {t('downloadUnavailable')}
                          </span>
                        )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('downloadNoPhotos')}</p>
            )}
          </div>
          <div
            className={cn(
              'px-6 py-4 bg-background/95 border-t border-border',
              'sm:px-6 sm:bg-transparent sm:border-0',
            )}
          >
              <div
                className={cn(
                  'flex flex-col gap-3',
                  'sm:flex-row sm:flex-wrap',
                  isRTL ? 'sm:flex-row-reverse' : 'sm:flex-row',
                )}
              >
                {zipDownloadUrl ? (
                  <Button
                    className="flex flex-1 min-w-[140px] justify-center"
                    disabled={downloadingId === 'zip'}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleZipDownload();
                    }}
                  >
                  {downloadingId === 'zip' ? (
                    <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                  ) : (
                    <Download className="mr-2 size-4" aria-hidden />
                  )}
                  {downloadingId === 'zip' ? t('downloadInProgress') : t('downloadAllZip')}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="secondary"
                className="flex-1 min-w-[140px]"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenChange(false);
                }}
              >
                {t('close')}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
