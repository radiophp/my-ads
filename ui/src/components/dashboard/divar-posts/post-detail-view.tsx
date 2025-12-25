import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import type { useTranslations } from 'next-intl';
import type { DivarPostContactInfo, DivarPostSummary } from '@/types/divar-posts';
import { PostMediaCarousel } from './post-media-carousel';
import { AmenitiesSection, AttributeLabelGrid, AttributeValueGrid } from './post-detail-sections';
import type { BusinessBadge } from './business-badge';
import type { PostDetailData } from './post-detail-data';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FaTelegramPlane, FaWhatsapp, FaSms, FaRegCopy } from 'react-icons/fa';
import {
  Bookmark,
  BookmarkCheck,
  Pencil,
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
  useGetPublicDivarCategoryFilterQuery,
  useRemovePostFromRingBinderFolderMutation,
  useUpsertPostNoteMutation,
} from '@/features/api/apiSlice';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { AMENITY_CONFIG } from './post-detail-sections';
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
  const [upsertPostNote, { isLoading: isSavingInlineNote }] = useUpsertPostNoteMutation();
  const [deletePostNote, { isLoading: isDeletingInlineNote }] = useDeletePostNoteMutation();
  const savedFolders = savedData?.saved ?? [];
  const isSaved = savedFolders.length > 0;
  const noteContent = savedData?.note?.content ?? null;
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(noteContent ?? '');
  const isMutatingNote = isSavingInlineNote || isDeletingInlineNote;
  const actionButtonClass = cn(
    'flex flex-1 basis-0 items-center gap-1 rounded-none px-2 py-1 text-xs',
    isRTL ? 'first:rounded-r-md last:rounded-l-md' : 'first:rounded-l-md last:rounded-r-md',
  );
  useEffect(() => {
    if (!isSaved && savedDialogOpen) {
      setSavedDialogOpen(false);
    }
  }, [isSaved, savedDialogOpen]);
  useEffect(() => {
    if (!isEditingNote) {
      setNoteDraft(noteContent ?? '');
    }
  }, [noteContent, isEditingNote]);
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

  const handleStartNoteEdit = () => {
    if (!ensureAuthenticated()) {
      return;
    }
    setNoteDraft(noteContent ?? '');
    setIsEditingNote(true);
  };

  const handleCancelNoteEdit = () => {
    setNoteDraft(noteContent ?? '');
    setIsEditingNote(false);
  };

  const handleSaveNote = async () => {
    const trimmed = noteDraft.trim();
    const previous = (noteContent ?? '').trim();
    if (trimmed === previous) {
      setIsEditingNote(false);
      return;
    }
    try {
      if (trimmed.length > 0) {
        await upsertPostNote({ postId: post.id, content: trimmed }).unwrap();
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
      setIsEditingNote(false);
      setNoteDraft(trimmed);
    } catch (error) {
      console.error('Failed to update note', error);
      toast({
        title: t('noteSection.updateError'),
        variant: 'destructive',
      });
    }
  };
  const canSaveNote = noteDraft.trim() !== (noteContent ?? '').trim();

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
    const owner = contactInfo?.ownerName || post.ownerName || t('contactInfo.ownerUnknown');
    const phone = contactInfo?.phoneNumber ?? t('contactInfo.phoneUnknown');
    const published = publishedDisplay ?? t('shareMessagePublishUnknown');
    const location = cityDistrict ?? t('shareMessageLocationUnknown');

    // Pull translated labels once to ensure we don't print raw keys
    const printLabels = {
      owner: t('contactInfo.ownerLabel'),
      phone: t('contactInfo.phoneLabel'),
      location: t('shareMessageLocationLabel'),
      publish: t('shareMessagePublishLabel'),
      title: t('shareMessageTitleLabel'),
      link: t('shareMessageLinkLabel'),
      category: t('shareMessageCategoryLabel'),
      business: t('shareMessageBusinessLabel'),
    };

    const categoryDisplay =
      categoryFilter?.categoryName ?? post.categoryName ?? post.categorySlug ?? t('labels.notAvailable');

    const coreSummary = [
      { label: printLabels.owner, value: owner },
      { label: printLabels.phone, value: phone },
      { label: printLabels.location, value: location },
      { label: printLabels.publish, value: published },
      { label: printLabels.title, value: '' },
      { label: printLabels.link, value: '' },
      {
        label: printLabels.category,
        value: categoryDisplay,
      },
      {
        label: printLabels.business,
        value: businessBadge?.label ?? t('businessType.unknown'),
      },
    ];

    const summaryTriples = [
      { label: t('labels.postCode'), value: post.code?.toString() ?? '' },
      { label: printLabels.category, value: categoryDisplay },
      coreSummary[0],
      coreSummary[1],
      coreSummary[2],
    ].filter((row) => row.value && row.value.toString().trim().length > 0);

    const summaryRows =
      summaryTriples.length > 0
        ? `<tr>
            ${summaryTriples
              .map(
                (row) =>
                  `<td style="font-weight:700;background:#f3f4f6;">${row.label}</td>`,
              )
              .join('')}
          </tr>
          <tr>
            ${summaryTriples
              .map(
                (row) =>
                  `<td>${row.value}</td>`,
              )
              .join('')}
          </tr>`
        : '';

    const detailPairs = combinedDetailEntries
      .filter((entry) => entry.value && entry.value.toString().trim().length > 0)
      .map((entry) => ({ label: entry.label, value: entry.value }));

    const detailRows = detailPairs.length
      ? detailPairs
          .reduce<string[]>((rows, pair, idx) => {
            if (idx % 3 === 0) rows.push('');
            const rowIdx = Math.floor(idx / 3);
            rows[rowIdx] += `<td style="font-weight:600;background:#fdfdfd;min-width:140px;">${pair.label}</td>
                             <td style="min-width:180px;">${pair.value}</td>`;
            return rows;
          }, [])
          .map((row) => `<tr>${row}</tr>`)
          .join('')
      : '';

    const amenityPairs = AMENITY_CONFIG.reduce<{ label: string; value: string }[]>((acc, config) => {
      const value = post[config.key];
      if (value === true) {
        acc.push({ label: t(config.labelKey), value: t('labels.booleanYes') });
      }
      return acc;
    }, []);

    const attributeRows =
      detailData.attributeValueEntries.length > 0 || amenityPairs.length > 0
        ? [...detailData.attributeValueEntries.map((attr) => ({ label: attr.label, value: attr.value })), ...amenityPairs]
            .reduce<string[]>((rows, pair, idx) => {
              if (idx % 3 === 0) rows.push('');
              const rowIdx = Math.floor(idx / 3);
              rows[rowIdx] += `<td style="padding:8px 10px;font-weight:600;border:1px solid #e5e7eb;background:#fdfdfd;min-width:140px;">${pair.label}</td>
                               <td style="padding:8px 10px;border:1px solid #e5e7eb;min-width:180px;">${pair.value}</td>`;
              return rows;
            }, [])
            .map((row) => `<tr>${row}</tr>`)
            .join('')
        : '';

    const labelOnlyLine =
      detailData.attributeLabelOnlyEntries.length > 0
        ? `<p style="margin-top:12px; margin-bottom:0; color:#111; line-height:1.6;">
             <span style="font-weight:700;">${t('labels.otherFeatures')}:</span>
             <span>${detailData.attributeLabelOnlyEntries.map((attr) => attr.label).join(' ، ')}</span>
           </p>`
        : '';

    const html = `
<!doctype html>
<html ${isRTL ? 'dir="rtl"' : ''}>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${post.title ?? t('shareMessageTitleUnknown')}</title>
  <style>
    @font-face {
      font-family: 'IRANSans';
      src: url('/font/IRANSans/IRANSans%20Regular/IRANSans%20Regular.ttf') format('truetype');
      font-weight: 400;
      font-style: normal;
      font-display: swap;
    }
    body { font-family: 'IRANSans','Inter',system-ui,-apple-system,BlinkMacSystemFont,sans-serif; margin: 20px; color: #111; font-size: 12px; }
    h1 { font-size: 16px; margin-bottom: 6px; }
    h2 { margin-top: 14px; margin-bottom: 6px; font-size: 12px; color: #374151; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; border:1px solid #e5e7eb; table-layout: fixed; }
    .print-table td { padding:8px; border:1px solid #e5e7eb; font-size: 12px; word-wrap: break-word; }
    .print-container { width:100%; max-width:1100px; margin:0 auto; }
    @page { size: A4 landscape; margin: 16mm; }
  </style>
</head>
<body>
  <div class="print-container">
    <h1>${post.title ?? ''}</h1>
    <table class="print-table">${summaryRows}</table>
    <table class="print-table">
      ${detailRows}
    </table>
    ${
      attributeRows
        ? `<table class="print-table" style="margin-top:12px;">${attributeRows}</table>`
        : ''
    }
    ${labelOnlyLine}
    ${
      post.description
        ? (() => {
            const flat = post.description
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean)
              .join('. ');
            const normalized = flat.endsWith('.') ? flat : `${flat}.`;
            return `<div style="margin-top:16px;">
              <p style="margin:6px 0 0 0;line-height:1.6;">
                <span style="font-weight:700;">${t('shareMessageDescriptionLabel')}:</span>
                <span style="margin-${isRTL ? 'right' : 'left'}:6px;">${normalized}</span>
              </p>
            </div>`;
          })()
        : ''
    }
  </div>
</body>
</html>`;

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
          <div className="flex w-full flex-wrap gap-0">
            {onShareWhatsapp || onShareTelegram || smsHref || onCopyLink ? (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className={actionButtonClass}
                  onClick={() => setShareDialogOpen(true)}
                >
                  <Share2 className="size-3.5 [@media(max-width:393px)]:hidden" aria-hidden="true" />
                  <span>{t('sharePost')}</span>
                </Button>
                <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
                  <DialogContent className="max-w-sm" hideCloseButton={false}>
                    <DialogHeader>
                      <DialogTitle>{t('sharePost')}</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-3">
                      {onShareWhatsapp ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="flex items-center gap-2"
                          onClick={() => {
                            onShareWhatsapp();
                            setShareDialogOpen(false);
                          }}
                        >
                          <FaWhatsapp className="text-green-600" />
                          <span>{t('shareWhatsApp')}</span>
                        </Button>
                      ) : null}
                      {onShareTelegram ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="flex items-center gap-2"
                          onClick={() => {
                            onShareTelegram();
                            setShareDialogOpen(false);
                          }}
                        >
                          <FaTelegramPlane className="text-sky-500" />
                          <span>{t('shareTelegram')}</span>
                        </Button>
                      ) : null}
                      {smsHref ? (
                        <Button
                          asChild
                          variant="outline"
                          className="flex items-center gap-2 sm:hidden"
                        >
                          <a href={smsHref} onClick={() => setShareDialogOpen(false)}>
                            <FaSms className="text-primary" />
                            <span>{t('shareSms')}</span>
                          </a>
                        </Button>
                      ) : null}
                      {onCopyLink ? (
                        <Button
                          type="button"
                          variant="outline"
                          className="flex items-center gap-2"
                          onClick={() => {
                            onCopyLink();
                            setShareDialogOpen(false);
                          }}
                        >
                          <FaRegCopy />
                          <span>{copyLinkLabel ?? t('copyLink')}</span>
                        </Button>
                      ) : null}
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className={actionButtonClass}
              onClick={handlePrint}
            >
              <Printer className="size-3.5 [@media(max-width:393px)]:hidden" aria-hidden="true" />
              <span>{t('print')}</span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className={actionButtonClass}
              onClick={onRequestContactInfo}
              disabled={!onRequestContactInfo || contactLoading}
            >
              {contactLoading ? (
                <Loader2 className="size-3.5 animate-spin [@media(max-width:393px)]:hidden" />
              ) : (
                <Phone className="size-3.5 [@media(max-width:393px)]:hidden" />
              )}
              <span>{t('contactInfo.button')}</span>
            </Button>
            {!noteContent && !isEditingNote ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleStartNoteEdit}
                className={actionButtonClass}
              >
                <Pencil className="size-3.5 [@media(max-width:393px)]:hidden" aria-hidden="true" />
                <span>{t('noteSection.buttonLabel')}</span>
              </Button>
            ) : null}
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
                  <BookmarkCheck className="size-3.5 [@media(max-width:393px)]:hidden" />
                  <span>{t('saveToFolder')}</span>
                </>
              ) : (
                <>
                  <Bookmark className="size-3.5 [@media(max-width:393px)]:hidden" />
                  <span>{t('saveToFolder')}</span>
                </>
              )}
            </Button>
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
              <span>{t('labels.postCode')}:</span>
              <span className="font-mono text-sm">{post.code ?? '—'}</span>
              <Copy className="size-4" aria-hidden />
            </button>
            {publishedDisplay ? (
              <span className="inline-flex items-center gap-2 rounded-md border border-border/70 bg-muted/40 px-3 py-1 text-sm font-normal text-foreground">
                <Clock3 className="size-4" aria-hidden />
                <span>{publishedDisplay}</span>
              </span>
            ) : null}
          </div>
          {contactInfo ? (
            <div className="rounded-xl border border-border/70 bg-muted/30 p-3 text-sm shadow-sm">
              <div className="flex flex-col gap-1">
                <p className="text-xs text-muted-foreground">{t('contactInfo.ownerLabel')}</p>
                <p className="text-sm font-semibold text-foreground">
                  {contactInfo.ownerName ?? t('contactInfo.ownerUnknown')}
                </p>
              </div>
              <div className="mt-2 flex flex-col gap-1">
                <p className="text-xs text-muted-foreground">{t('contactInfo.phoneLabel')}</p>
                <p className="text-base font-semibold text-foreground ltr:font-mono rtl:font-sans">
                  {contactInfo.phoneNumber ?? t('contactInfo.missingShort')}
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!contactInfo.phoneNumber}
                  className="flex items-center gap-2"
                  onClick={() => {
                    if (contactInfo.phoneNumber) {
                      window.location.href = `tel:${contactInfo.phoneNumber}`;
                    }
                  }}
                >
                  <Phone className="size-4" />
                  <span>{t('contactInfo.call')}</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!contactInfo.phoneNumber}
                  className="flex items-center gap-2"
                  onClick={() => handleCopyContactInfo(contactInfo)}
                >
                  <Copy className="size-4" />
                  <span>{t('contactInfo.copy')}</span>
                </Button>
              </div>
            </div>
          ) : null}
          {noteContent || isEditingNote ? (
            <div className="rounded-xl border border-border/70 bg-muted/30 p-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-foreground">{t('noteSection.heading')}</p>
                {isEditingNote ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelNoteEdit}
                    disabled={isMutatingNote}
                  >
                    {t('noteSection.cancel')}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleStartNoteEdit}
                    className="flex items-center gap-1"
                  >
                    <span className="sr-only">{t('noteSection.editButton')}</span>
                    <Pencil className="size-4" aria-hidden="true" />
                  </Button>
                )}
              </div>
              {isEditingNote ? (
                <>
                  <textarea
                    className="mt-3 w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none"
                    placeholder={t('noteSection.placeholder')}
                    value={noteDraft}
                    onChange={(event) => setNoteDraft(event.target.value)}
                    maxLength={2000}
                  />
                  <div className={cn('mt-3 flex', isRTL ? 'justify-start' : 'justify-end')}>
                    <Button
                      type="button"
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={handleSaveNote}
                      disabled={!canSaveNote || isMutatingNote}
                    >
                      {isMutatingNote ? t('noteSection.saving') : t('noteSection.save')}
                    </Button>
                  </div>
                </>
              ) : (
                <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{noteContent}</p>
              )}
            </div>
          ) : null}
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
                      style={{ wordBreak: 'break-all' }}
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
                <span>{t('labels.postCode')}:</span>
                <span className="font-mono text-xs">{post.code ?? '—'}</span>
                <Copy className="size-4" aria-hidden />
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
            hasDownloadableMedia={hasDownloadableMedia}
            onRequestDownload={onRequestDownload}
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
          className="h-[100dvh] w-screen max-w-none rounded-none p-0 sm:h-auto sm:max-w-lg sm:rounded-lg"
        >
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
