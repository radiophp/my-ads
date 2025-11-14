import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import type { useTranslations } from 'next-intl';
import type { DivarPostSummary } from '@/types/divar-posts';
import { PostMediaCarousel } from './post-media-carousel';
import { AmenitiesSection, AttributeLabelGrid, AttributeValueGrid } from './post-detail-sections';
import type { BusinessBadge } from './business-badge';
import type { PostDetailData } from './post-detail-data';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FaTelegramPlane, FaWhatsapp, FaSms, FaRegCopy } from 'react-icons/fa';
import { Bookmark, BookmarkCheck, Pencil, Plus, Share2 } from 'lucide-react';
import { SaveToFolderDialog } from '@/components/ring-binder/save-to-folder-dialog';
import { SavedFoldersDialog } from '@/components/ring-binder/saved-folders-dialog';
import {
  useDeletePostNoteMutation,
  useGetPostSavedFoldersQuery,
  useRemovePostFromRingBinderFolderMutation,
  useUpsertPostNoteMutation,
} from '@/features/api/apiSlice';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

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
}: PostDetailViewProps): JSX.Element {
  const combinedDetailEntries = [
    ...detailData.featuredDetailEntries,
    ...detailData.infoRowEntries,
    ...detailData.secondaryDetailEntries,
  ];
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
          <div className="rounded-xl border border-border/70 bg-muted/30 px-3 py-3 text-sm min-h-[64px]">
            {noteContent || isEditingNote ? (
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
            ) : null}
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
            ) : noteContent ? (
              <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{noteContent}</p>
            ) : null}
          </div>
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
