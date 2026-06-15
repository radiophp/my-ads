import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import type { useTranslations } from 'next-intl';
import type { DivarPostContactInfo, DivarPostSummary } from '@/types/divar-posts';
import { PostMediaCarousel } from './post-media-carousel';
import { SharePostDialog } from './post-share-dialog';
import { ContactInfoCard } from './post-contact-info-card';
import { InlineNoteEditor } from './post-inline-note-editor';
import { AmenitiesSection, AttributeLabelGrid, AttributeValueGrid } from './post-detail-sections';
import type { BusinessBadge } from './business-badge';
import type { PostDetailData } from './post-detail-data';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import {
  Bookmark,
  BookmarkCheck,
  Pencil,
  Download,
  Share2,
  Phone,
  Copy,
  Loader2,
  Printer,
  Clock3,
} from 'lucide-react';
import { SaveToFolderDialog } from '@/components/ring-binder/save-to-folder-dialog';
import { SavedFoldersDialog } from '@/components/ring-binder/saved-folders-dialog';
import {
  useDeletePostNoteMutation,
  useGetPostSavedFoldersQuery,
  useRemovePostFromRingBinderFolderMutation,
  useUpsertPostNoteMutation,
} from '@/features/api/endpoints/ring-binder';
import { useGetPublicDivarCategoryFilterQuery } from '@/features/api/endpoints/divar-category-filters';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { AMENITY_CONFIG } from './post-detail-sections';
import { createPostPrintContent } from './post-print-utils';
import { PostLocationMap } from './post-location-map';
import { PhoneOtpLoginForm } from '@/components/auth/phone-otp-login-form';
import { useAppSelector } from '@/lib/hooks';

export type PostDetailViewProps = {
  post: DivarPostSummary;
  t: ReturnType<typeof useTranslations>;
  isRTL: boolean;
  businessBadge: BusinessBadge;
  cityDistrict: string | null;
  publishedDisplay: string | null;
  hasDownloadableMedia: boolean;
  onRequestDownload: () => void;
  detailData: PostDetailData;
  onShareWhatsapp?: () => void;
  onShareTelegram?: () => void;
  smsHref?: string | null;
  onCopyLink?: () => void;
  copyLinkLabel?: string;
  onRequestContactInfo?: () => void;
  contactInfo?: DivarPostContactInfo | null;
  contactLoading?: boolean;
  onMapReady?: () => void;
  mapWrapperClassName?: string;
};

const DESCRIPTION_SPAN_STYLE: React.CSSProperties = { wordBreak: 'break-all' };

export function PostDetailView({
  post,
  t,
  isRTL,
  businessBadge,
  cityDistrict,
  publishedDisplay,
  hasDownloadableMedia,
  onRequestDownload,
  detailData,
  onShareWhatsapp,
  onShareTelegram,
  smsHref,
  onCopyLink,
  copyLinkLabel,
  onRequestContactInfo,
  contactInfo,
  contactLoading,
  onMapReady,
  mapWrapperClassName,
}: PostDetailViewProps): JSX.Element {
  const combinedDetailEntries = [
    ...detailData.featuredDetailEntries,
    ...detailData.infoRowEntries,
    ...detailData.secondaryDetailEntries,
  ];
  const hasLocation = typeof post.latitude === 'number' && typeof post.longitude === 'number';
  const { data: categoryFilter } = useGetPublicDivarCategoryFilterQuery(post.categorySlug, {
    skip: !post.categorySlug,
  });
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [savedDialogOpen, setSavedDialogOpen] = useState(false);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const isAuthenticated = useAppSelector((state) => Boolean(state.auth.accessToken));
  const { data: savedData, refetch: refetchSaved, isFetching: isFetchingSaved } =
    useGetPostSavedFoldersQuery(post.id, { skip: !post.id });
  const [removePostFromFolder, { isLoading: isRemoving }] =
    useRemovePostFromRingBinderFolderMutation();
  const [upsertPostNote] = useUpsertPostNoteMutation();
  const [deletePostNote] = useDeletePostNoteMutation();
  const savedFolders = savedData?.saved ?? [];
  const isSaved = savedFolders.length > 0;
  const noteContent = savedData?.note?.content ?? null;
  const [noteEditTrigger, setNoteEditTrigger] = useState(0);
  const actionButtonClass = cn(
    'flex flex-1 basis-0 items-center gap-1 rounded-none px-2 py-1 text-xs',
    isRTL
      ? 'first:rounded-r-md last:rounded-l-md'
      : 'first:rounded-l-md last:rounded-r-md',
  );
  useEffect(() => {
    if (!isSaved && savedDialogOpen) {
      setSavedDialogOpen(false);
    }
  }, [isSaved, savedDialogOpen]);
  useEffect(() => {
    if (loginDialogOpen && isAuthenticated) {
      setLoginDialogOpen(false);
    }
  }, [loginDialogOpen, isAuthenticated]);

  const ensureAuthenticated = () => {
    if (!isAuthenticated) {
      setLoginDialogOpen(true);
      return false;
    }
    return true;
  };

  const handleSaveButtonClick = () => {
    if (!ensureAuthenticated()) {
      return;
    }
    if (isSaved) {
      setSavedDialogOpen(true);
    } else {
      setSaveDialogOpen(true);
    }
  };

  const handleRemoveFromFolder = async (folderId: string) => {
    try {
      await removePostFromFolder({ folderId, postId: post.id }).unwrap();
      toast({
        title: t('savedDialog.removedTitle'),
        description: t('savedDialog.removedDescription'),
      });
      await refetchSaved();
    } catch (error) {
      console.error('Failed to remove saved post', error);
      toast({
        title: t('savedDialog.removeError'),
        variant: 'destructive',
      });
    }
  };

  const handleNoteSave = async (content: string) => {
    try {
      if (content.length > 0) {
        await upsertPostNote({ postId: post.id, content }).unwrap();
        toast({
          title: t('noteSection.updateSuccess'),
          description: t('noteSection.updateSuccessDescription'),
        });
      } else {
        await deletePostNote({ postId: post.id }).unwrap();
        toast({
          title: t('noteSection.deleteSuccess'),
        });
      }
      await refetchSaved();
    } catch (error) {
      console.error('Failed to update note', error);
      toast({
        title: t('noteSection.updateError'),
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleCopyContactInfo = async (info: DivarPostContactInfo) => {
    if (!info.phoneNumber) {
      return;
    }
    const owner = info.ownerName?.trim() || t('contactInfo.ownerUnknown');
    const text = `${owner} - ${info.phoneNumber}`;
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: t('contactInfo.copySuccess'),
      });
    } catch (error) {
      console.error('Failed to copy contact info', error);
      toast({
        title: t('contactInfo.copyError'),
        variant: 'destructive',
      });
    }
  };

  const handlePrint = () => {
    const html = createPostPrintContent({
      t,
      post,
      isRTL,
      contactInfo,
      publishedDisplay,
      cityDistrict,
      businessBadge,
      categoryFilter,
      combinedDetailEntries,
      detailData,
      AMENITY_CONFIG,
    });

    const openPrintWindow = () => {
      const win = window.open('', '_blank');
      if (!win) {
        toast({ title: t('contactInfo.copyError'), variant: 'destructive' });
        return;
      }
      win.document.open();
      win.document.write(html);
      win.document.close();
      const triggerPrint = () => {
        try {
          win.focus();
          win.print();
        } catch {
          /* ignore */
        }
      };
      if (win.document.readyState === 'complete') {
        setTimeout(triggerPrint, 100);
      } else {
        win.onload = () => setTimeout(triggerPrint, 100);
      }
    };

    const isMobileDevice = typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobileDevice) {
      openPrintWindow();
      return;
    }

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      openPrintWindow();
      return;
    }
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      document.body.removeChild(iframe);
    }, 150);
  };

  return (
    <div className="space-y-8 overflow-x-hidden">
      <div className="flex min-w-0 flex-col gap-6 lg:flex-row">
        <div className="order-2 flex min-w-0 flex-1 flex-col gap-6 lg:order-1">
          <div className="flex w-full flex-col gap-2">
          <div
            className={cn(
              'flex w-full flex-wrap gap-0 divide-x divide-border/40',
              isRTL && 'divide-x-reverse',
            )}
          >
              {onShareWhatsapp || onShareTelegram || smsHref || onCopyLink ? (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className={actionButtonClass}
                    onClick={() => setShareDialogOpen(true)}
                  >
                    <Share2 className="size-3.5" aria-hidden="true" />
                    <span>{t('sharePost')}</span>
                  </Button>
                  <SharePostDialog
                    open={shareDialogOpen}
                    onOpenChange={setShareDialogOpen}
                    t={t}
                    onShareWhatsapp={onShareWhatsapp}
                    onShareTelegram={onShareTelegram}
                    smsHref={smsHref}
                    onCopyLink={onCopyLink}
                    copyLinkLabel={copyLinkLabel}
                  />
                </>
              ) : null}
              {post.hasContactInfo ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className={actionButtonClass}
                  onClick={onRequestContactInfo}
                  disabled={!onRequestContactInfo || contactLoading}
                >
                  {contactLoading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                  <Phone className="size-3.5" />
                  )}
                  <span>{t('contactInfo.button')}</span>
                </Button>
              ) : null}
              {hasDownloadableMedia ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className={actionButtonClass}
                  onClick={onRequestDownload}
                >
                  <Download className="size-3.5" aria-hidden="true" />
                  <span>{t('downloadPhotos')}</span>
                </Button>
              ) : null}
            </div>
            <div
              className={cn(
                'flex w-full flex-wrap gap-0 divide-x divide-border/40',
                isRTL && 'divide-x-reverse',
              )}
            >
              <Button
                type="button"
                variant={isSaved ? 'outline' : 'secondary'}
                size="sm"
                className={cn(
                  actionButtonClass,
                  isSaved && 'border-emerald-500 text-emerald-600 hover:bg-emerald-50',
                )}
                onClick={handleSaveButtonClick}
              >
                {isSaved ? (
                  <>
                    <BookmarkCheck className="size-3.5" />
                    <span>{t('saveToFolder')}</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="size-3.5" />
                    <span>{t('saveToFolder')}</span>
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setNoteEditTrigger((prev) => prev + 1)}
                className={actionButtonClass}
              >
                <Pencil className="size-3.5" aria-hidden="true" />
                <span>{t('noteSection.buttonLabel')}</span>
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className={actionButtonClass}
                onClick={handlePrint}
              >
                <Printer className="size-3.5" aria-hidden="true" />
                <span>{t('print')}</span>
              </Button>
            </div>
          </div>
          <div className="hidden flex-wrap items-center gap-2 lg:flex">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md border border-border/70 bg-muted/40 px-3 py-1 text-sm font-normal text-foreground transition hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => {
                if (post.code) {
                  navigator.clipboard
                    .writeText(post.code.toString())
                    .then(() => toast({ title: t('labels.postCodeCopied') }))
                    .catch(() =>
                      toast({ title: t('contactInfo.copyError'), variant: 'destructive' }),
                    );
                }
              }}
              aria-label={t('labels.postCode')}
            >
              <Copy className="size-4" aria-hidden />
              <span>{t('labels.postCode')}:</span>
              <span className="font-mono text-sm">{post.code ?? '—'}</span>
            </button>
            {publishedDisplay ? (
              <span className="inline-flex items-center gap-2 rounded-md border border-border/70 bg-muted/40 px-3 py-1 text-sm font-normal text-foreground">
                <Clock3 className="size-4" aria-hidden />
                <span>{publishedDisplay}</span>
              </span>
            ) : null}
          </div>
          {contactInfo ? (
            <ContactInfoCard
              contactInfo={contactInfo}
              t={t}
              onCopy={handleCopyContactInfo}
            />
          ) : null}
          <InlineNoteEditor
            noteContent={noteContent}
            isRTL={isRTL}
            t={t}
            onSave={handleNoteSave}
            editTrigger={noteEditTrigger}
          />
          {combinedDetailEntries.length > 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {combinedDetailEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex min-w-0 flex-col items-center gap-2 rounded-2xl border border-border/70 p-3 text-center shadow-sm"
                >
                  <span className="text-xs text-muted-foreground">{entry.label}</span>
                  <span className="break-words text-sm font-semibold text-foreground">
                    {entry.value}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
          <AmenitiesSection post={post} t={t} />
          <dl className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
            {detailData.descriptionLines ? (
              <div className="col-span-full space-y-1">
                <dt className="font-medium text-foreground">{t('labels.description')}</dt>
                <dd
                  className="text-sm text-muted-foreground"
                  style={{ wordBreak: 'break-all', whiteSpace: 'pre-wrap', lineHeight: '2' }}
                >
                  {detailData.descriptionLines.map((line, index) => (
                    <span
                      key={`description-line-${index}`}
                      style={DESCRIPTION_SPAN_STYLE}
                    >
                      {line || '\u00A0'}
                      {index < detailData.descriptionLines!.length - 1 ? <br /> : null}
                    </span>
                  ))}
                </dd>
              </div>
            ) : null}
            <AttributeValueGrid entries={detailData.attributeValueEntries} />
            <AttributeLabelGrid entries={detailData.attributeLabelOnlyEntries} />
          </dl>
        </div>
        <div className="order-1 min-w-0 lg:order-2 lg:w-2/5">
          <div className="mb-3 lg:hidden">
            <div className="flex w-full overflow-hidden rounded-md border border-border/70 bg-muted/40 text-foreground">
              <button
                type="button"
                className="inline-flex flex-1 basis-0 items-center justify-center gap-2 px-3 py-2 text-xs font-normal transition hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => {
                  if (post.code) {
                    navigator.clipboard
                      .writeText(post.code.toString())
                      .then(() => toast({ title: t('labels.postCodeCopied') }))
                      .catch(() =>
                        toast({ title: t('contactInfo.copyError'), variant: 'destructive' }),
                      );
                  }
                }}
                aria-label={t('labels.postCode')}
              >
                <Copy className="size-4" aria-hidden />
                <span>{t('labels.postCode')}:</span>
                <span className="font-mono text-xs">{post.code ?? '—'}</span>
              </button>
              {publishedDisplay ? (
                <span
                  className={cn(
                    'inline-flex flex-1 basis-0 items-center justify-center gap-2 px-3 py-2 text-xs font-normal',
                    isRTL ? 'border-r border-border/70' : 'border-l border-border/70',
                  )}
                >
                  <Clock3 className="size-4" aria-hidden />
                  <span>{publishedDisplay}</span>
                </span>
              ) : null}
            </div>
          </div>
          <PostMediaCarousel
            post={post}
            isRTL={isRTL}
            businessBadge={businessBadge}
            cityDistrict={cityDistrict}
            t={t}
          />
          {hasLocation ? (
            <div className={cn('hidden lg:block', mapWrapperClassName)}>
              <PostLocationMap
                lat={post.latitude as number}
                lon={post.longitude as number}
                t={t}
                isRTL={isRTL}
                onReady={onMapReady}
              />
            </div>
          ) : null}
        </div>
      </div>
      {hasLocation ? (
        <div className={cn('mt-6 lg:hidden', mapWrapperClassName)}>
          <PostLocationMap
            lat={post.latitude as number}
            lon={post.longitude as number}
            t={t}
            isRTL={isRTL}
            onReady={onMapReady}
          />
        </div>
      ) : null}
      <SaveToFolderDialog
        post={post}
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        onSaved={refetchSaved}
        initialNote={noteContent}
        isRTL={isRTL}
      />
      <SavedFoldersDialog
        open={savedDialogOpen}
        onOpenChange={setSavedDialogOpen}
        folders={savedFolders}
        isLoading={isFetchingSaved || isRemoving}
        onRemove={handleRemoveFromFolder}
        onAddMore={() => {
          setSavedDialogOpen(false);
          setSaveDialogOpen(true);
        }}
      />
      <Dialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen}>
        <DialogContent
          hideCloseButton
          className="h-dvh w-screen max-w-none rounded-none p-0 sm:h-auto sm:max-w-lg sm:rounded-lg"
          aria-describedby={undefined}
        >
          <DialogTitle className="sr-only">{t('loginTitle')}</DialogTitle>
          <DialogDescription className="sr-only">{t('loginDescription')}</DialogDescription>
          <div className="flex h-full flex-col">
            <div className="flex-1 overflow-y-auto">
              <PhoneOtpLoginForm />
            </div>
            <div className="border-t border-border/70 p-4 sm:border-t-0 sm:px-6 sm:pb-6">
              <div className={cn('flex', isRTL ? 'justify-start' : 'justify-end')}>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => setLoginDialogOpen(false)}
                >
                  {t('close')}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
