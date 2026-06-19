'use client';

import type { JSX } from 'react';
import { useTranslations } from 'next-intl';
import { ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DownloadPhotosDialog } from '@/components/dashboard/divar-posts/download-photos-dialog';
import { PostDetailView } from '@/components/dashboard/divar-posts/post-detail-view';
import { cn } from '@/lib/utils';
import type { DivarPostContactInfo, DivarPostSummary } from '@/types/divar-posts';
import type { PostDetailData } from '@/components/dashboard/divar-posts/post-detail-data';
import type { BusinessBadge } from '@/components/dashboard/divar-posts/business-badge';

type NotificationsPostDialogProps = {
  open: boolean;
  onClose: (open: boolean) => void;
  downloadDialogOpen: boolean;
  onDownloadDialogOpenChange: (open: boolean) => void;
  selectedPost: DivarPostSummary | null | undefined;
  postLoading: boolean;
  isPostError: boolean;
  detailData: PostDetailData | null;
  businessBadge: BusinessBadge | null;
  cityDistrict: string | null;
  publishedDisplay: string | null;
  hasDownloadableMedia: boolean;
  contactInfo: DivarPostContactInfo | null;
  contactLoading: boolean;
  isRTL: boolean;
  t: ReturnType<typeof useTranslations<'dashboard.posts'>>;
  onFetchContactInfo: () => void;
  onOpenDownloadDialog: () => void;
};

export function NotificationsPostDialog({
  open,
  onClose,
  downloadDialogOpen,
  onDownloadDialogOpenChange,
  selectedPost,
  postLoading,
  isPostError,
  detailData,
  businessBadge,
  cityDistrict,
  publishedDisplay,
  hasDownloadableMedia,
  contactInfo,
  contactLoading,
  isRTL,
  t,
  onFetchContactInfo,
  onOpenDownloadDialog,
}: NotificationsPostDialogProps): JSX.Element {
  const dialogTitle = selectedPost
    ? selectedPost.title ?? t('untitled', { externalId: selectedPost.externalId })
    : t('loading');

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent
          hideCloseButton
          className="left-0 top-0 h-dvh w-screen max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 pb-[env(safe-area-inset-bottom)] sm:left-1/2 sm:top-1/2 sm:flex sm:max-h-[90vh] sm:w-full sm:max-w-[1200px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:flex-col sm:overflow-hidden sm:rounded-2xl sm:p-8"
        >
          <div className="flex h-full flex-col overflow-hidden">
            <div className="border-b border-border px-6 py-4 sm:hidden">
              <p className={`break-words text-base font-semibold ${isRTL ? 'text-right' : 'text-center'}`}>
                {dialogTitle}
              </p>
            </div>
            <div className="hidden p-0 sm:block">
              <DialogHeader>
                <DialogTitle className="mb-4 flex flex-wrap items-center gap-2 break-words">
                  {dialogTitle}
                </DialogTitle>
                <DialogDescription className="sr-only">{dialogTitle}</DialogDescription>
              </DialogHeader>
            </div>
            <div className="flex-1 overflow-y-auto py-4 sm:p-0">
              {postLoading ? (
                <div className="flex flex-1 items-center justify-center py-24">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    <span>{t('loading')}</span>
                  </div>
                </div>
              ) : isPostError || !selectedPost || !detailData ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border/80 p-10 text-center text-muted-foreground">
                  <p>{t('detailLoadFailed')}</p>
                </div>
              ) : (
                <>
                  <PostDetailView
                    post={selectedPost}
                    t={t}
                    isRTL={isRTL}
                    businessBadge={businessBadge}
                    cityDistrict={cityDistrict}
                    publishedDisplay={publishedDisplay}
                    hasDownloadableMedia={hasDownloadableMedia}
                    onRequestDownload={onOpenDownloadDialog}
                    detailData={detailData}
                    onRequestContactInfo={onFetchContactInfo}
                    contactInfo={contactInfo}
                    contactLoading={contactLoading}
                    mapWrapperClassName="lg:px-4"
                  />
                  <div className={cn('mt-6 flex', isRTL ? 'justify-start' : 'justify-end')}>
                    <Button asChild variant="link" className="h-auto p-0 text-sm">
                      <a
                        href={
                          selectedPost.permalink ?? `https://divar.ir/v/${selectedPost.externalId}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2"
                      >
                        {t('openOnDivar')}
                        <ExternalLink className="size-4" aria-hidden />
                      </a>
                    </Button>
                  </div>
                </>
              )}
            </div>
            <div className="border-t border-border bg-background/95 px-6 py-4 sm:border-0 sm:bg-transparent sm:px-0">
              <div
                className={cn(
                  'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
                  isRTL ? 'sm:flex-row-reverse' : 'sm:flex-row',
                )}
              >
                <div className={cn('flex flex-wrap gap-3', isRTL ? 'flex-row-reverse' : 'flex-row')}>
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-w-[140px] flex-1 sm:flex-none"
                    onClick={() => onClose(false)}
                  >
                    {t('close')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <DownloadPhotosDialog
        open={downloadDialogOpen}
        onOpenChange={onDownloadDialogOpenChange}
        post={selectedPost ?? null}
        isRTL={isRTL}
        t={t}
      />
    </>
  );
}
