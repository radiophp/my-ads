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
import { Bookmark, BookmarkCheck, Pencil, Plus, Share2, Phone, Copy, Loader2, Printer } from 'lucide-react';
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
}: PostDetailViewProps): JSX.Element {
  const combinedDetailEntries = [
    ...detailData.featuredDetailEntries,
    ...detailData.infoRowEntries,
    ...detailData.secondaryDetailEntries,
  ];
  const { data: categoryFilter } = useGetPublicDivarCategoryFilterQuery(post.categorySlug, {
    skip: !post.categorySlug,
  });
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [savedDialogOpen, setSavedDialogOpen] = useState(false);
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
  const handleSaveButtonClick = () => {
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

    const amenityIconMap: Record<string, string> = {
      hasParking: '🚗',
      hasElevator: '🛗',
      hasWarehouse: '🏢',
      hasBalcony: '🪟',
    };

    const amenityRows = '';

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
    .badge { display: inline-flex; padding: 4px 10px; border-radius: 999px; background: #eef2ff; color: #4338ca; font-weight: 600; margin-right: 8px; }
    .pill { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 12px; background: #ecfeff; color: #0ea5e9; font-weight: 600; }
    .pill svg { width: 14px; height: 14px; }
    @page { size: A4 landscape; margin: 16mm; }
  </style>
</head>
<body>
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
</body>
</html>`;

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
      toast({ title: t('contactInfo.copyError'), variant: 'destructive' });
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
    <div className="space-y-8">
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="order-2 flex-1 space-y-6 lg:order-1">
          <div className="flex flex-wrap gap-2">
            {onShareWhatsapp || onShareTelegram || smsHref || onCopyLink ? (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="flex items-center gap-2 px-3 py-1 text-xs"
                  onClick={() => setShareDialogOpen(true)}
                >
                  <Share2 className="size-3.5" aria-hidden="true" />
                  <span className="sr-only">{t('sharePost')}</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2 px-3 py-1 text-xs"
                  onClick={handlePrint}
                >
                  <Printer className="size-3.5" aria-hidden="true" />
                  <span>{t('print')}</span>
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
              className="flex items-center gap-2 px-3 py-1 text-xs"
              onClick={onRequestContactInfo}
              disabled={!onRequestContactInfo || contactLoading}
            >
              {contactLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Phone className="size-3.5" />}
              <span>{t('contactInfo.button')}</span>
            </Button>
            {!noteContent && !isEditingNote ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleStartNoteEdit}
                className="flex items-center gap-2 px-3 py-1 text-xs"
              >
                <Plus className="size-3.5" aria-hidden="true" />
                <span>{t('noteSection.buttonLabel')}</span>
              </Button>
            ) : null}
            <Button
              type="button"
              variant={isSaved ? 'outline' : 'secondary'}
              size="sm"
              className={cn(
                'flex items-center gap-2 px-3 py-1 text-xs',
                isSaved && 'border-emerald-500 text-emerald-600 hover:bg-emerald-50',
              )}
              onClick={handleSaveButtonClick}
            >
              {isSaved ? (
                <>
                  <BookmarkCheck className="size-3.5" />
                  <span>{t('savedLabel')}</span>
                </>
              ) : (
                <>
                  <Bookmark className="size-3.5" />
                  <span>{t('saveToFolder')}</span>
                </>
              )}
            </Button>
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
              className="flex flex-col items-center gap-2 rounded-2xl border border-border/70 p-3 text-center shadow-sm"
                >
                  <span className="text-xs text-muted-foreground">{entry.label}</span>
                  <span className="text-sm font-semibold text-foreground">{entry.value}</span>
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
        <div className="order-1 lg:order-2 lg:w-2/5">
          <PostMediaCarousel
            post={post}
            isRTL={isRTL}
            businessBadge={businessBadge}
            cityDistrict={cityDistrict}
            publishedDisplay={publishedDisplay}
            hasDownloadableMedia={hasDownloadableMedia}
            onRequestDownload={onRequestDownload}
            t={t}
          />
        </div>
      </div>
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
    </div>
  );
}
