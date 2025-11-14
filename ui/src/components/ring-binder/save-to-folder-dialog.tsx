'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { DivarPostSummary } from '@/types/divar-posts';
import { toast } from '@/components/ui/use-toast';
import {
  useCreateRingBinderFolderMutation,
  useGetRingBinderFoldersQuery,
  useSavePostToRingBinderFolderMutation,
  useUpsertPostNoteMutation,
  useDeletePostNoteMutation,
} from '@/features/api/apiSlice';
import { cn } from '@/lib/utils';

export type SaveToFolderDialogProps = {
  post: DivarPostSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
  initialNote?: string | null;
  isRTL: boolean;
};

type BaseQueryError = { status: number | string; data?: unknown };

const isBaseQueryError = (error: unknown): error is BaseQueryError =>
  typeof error === 'object' && error !== null && 'status' in error;

export function SaveToFolderDialog({
  post,
  open,
  onOpenChange,
  onSaved,
  initialNote,
  isRTL,
}: SaveToFolderDialogProps) {
  const t = useTranslations('dashboard.posts');
  const { data, isLoading, isFetching: _isFetching, isError, refetch } = useGetRingBinderFoldersQuery(
    undefined,
    { skip: !open },
  );
  const folders = useMemo(() => data?.folders ?? [], [data?.folders]);
  const maxFolders = data?.maxFolders ?? 30;
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [createFolder, { isLoading: isCreating }] = useCreateRingBinderFolderMutation();
  const [savePostToFolder, { isLoading: isSaving }] = useSavePostToRingBinderFolderMutation();
  const [upsertPostNote, { isLoading: isSavingNote }] = useUpsertPostNoteMutation();
  const [deletePostNote, { isLoading: isDeletingNote }] = useDeletePostNoteMutation();
  const [noteValue, setNoteValue] = useState(initialNote ?? '');

  useEffect(() => {
    if (!open) {
      setSelectedFolderId(null);
      setNoteValue(initialNote ?? '');
      return;
    }
    if (folders.length === 0) {
      setSelectedFolderId(null);
      setNoteValue(initialNote ?? '');
      return;
    }
    setSelectedFolderId((current) => {
      if (current && current !== '__create__' && folders.some((folder) => folder.id === current)) {
        return current;
      }
      return folders[0]?.id ?? null;
    });
    setNoteValue(initialNote ?? '');
  }, [open, folders, initialNote]);

  const selectedFolder = useMemo(
    () => folders.find((folder) => folder.id === selectedFolderId) ?? null,
    [folders, selectedFolderId],
  );

  const handleConfirm = async () => {
    if (!selectedFolder || selectedFolderId === '__create__') {
      return;
    }
    try {
      await savePostToFolder({ folderId: selectedFolder.id, postId: post.id }).unwrap();
      const trimmedNote = noteValue.trim();
      const previousNote = (initialNote ?? '').trim();
      if (trimmedNote.length > 0) {
        await upsertPostNote({ postId: post.id, content: trimmedNote }).unwrap();
      } else if (previousNote.length > 0) {
        await deletePostNote({ postId: post.id }).unwrap();
      }
      toast({
        title: t('saveDialog.successTitle'),
        description: t('saveDialog.successDescription', {
          name: selectedFolder.name,
          title: post.title ?? post.externalId,
        }),
      });
      onSaved?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save post', error);
      const isDuplicate = isBaseQueryError(error) && error.status === 409;
      toast({
        title: t('saveDialog.saveError'),
        description: isDuplicate ? t('saveDialog.alreadySaved') : undefined,
        variant: 'destructive',
      });
    }
  };

  const handleCreateFolder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = newFolderName.trim();
    if (!trimmed) {
      return;
    }
    try {
      const folder = await createFolder({ name: trimmed }).unwrap();
      toast({
        title: t('saveDialog.createSuccess', { name: folder.name }),
      });
      setNewFolderName('');
      setSelectedFolderId(folder.id);
      await refetch();
    } catch (error) {
      console.error('Failed to create folder', error);
      const isDuplicate = isBaseQueryError(error) && error.status === 409;
      toast({
        title: t('saveDialog.createError'),
        description: isDuplicate ? t('saveDialog.duplicateError') : undefined,
        variant: 'destructive',
      });
    }
  };

  const renderFolderSelector = () => {
    if (folders.length === 0) {
      return (
        <div className="space-y-3">
          <div className="space-y-3 rounded-xl border border-dashed border-border/60 p-4 text-center">
            <p className="text-sm font-semibold text-foreground">{t('saveDialog.emptyTitle')}</p>
            <p className="text-sm text-muted-foreground">{t('saveDialog.emptyDescription')}</p>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/ring-binder" onClick={() => onOpenChange(false)}>
                {t('saveDialog.goToRingBinder')}
              </Link>
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          {t('saveDialog.selectLabel')}
        </label>
        <select
          className="w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none"
          value={selectedFolderId ?? ''}
          onChange={(event) => setSelectedFolderId(event.target.value)}
        >
          {folders.map((folder) => (
            <option key={folder.id} value={folder.id}>
              {folder.name}
            </option>
          ))}
          {folders.length < maxFolders ? (
            <option value="__create__">{t('saveDialog.createTitle')}</option>
          ) : null}
        </select>
      </div>
    );
  };

  const renderCreateSection = () => {
    const canCreate = folders.length < maxFolders;
    if (!canCreate) {
      return <p className="text-xs text-muted-foreground">{t('saveDialog.limitReached')}</p>;
    }

    if (selectedFolderId !== '__create__') {
      return null;
    }

    return (
      <div className="space-y-2">
        <p className="text-sm font-semibold text-foreground">{t('saveDialog.createTitle')}</p>
        <form className="flex flex-col gap-2 sm:flex-row" onSubmit={handleCreateFolder}>
          <Input
            className="flex-1"
            placeholder={t('saveDialog.createPlaceholder')}
            value={newFolderName}
            onChange={(event) => setNewFolderName(event.target.value)}
            maxLength={64}
            disabled={isCreating}
          />
          <Button type="submit" size="sm" disabled={isCreating || newFolderName.trim().length === 0}>
            {isCreating ? t('saveDialog.creating') : t('saveDialog.createButton')}
          </Button>
        </form>
      </div>
    );
  };

  const renderBody = () => {
    if (isLoading) {
      return <p className="text-sm text-muted-foreground">{t('saveDialog.loading')}</p>;
    }

    if (isError) {
      return (
        <div className="space-y-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">{t('saveDialog.error')}</p>
          <Button variant="destructive" size="sm" onClick={() => refetch()}>
            {t('saveDialog.retry')}
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {renderFolderSelector()}
        <p className="text-right text-xs text-muted-foreground">
          {t('saveDialog.folderCount', { count: folders.length, max: maxFolders })}
        </p>
        {renderCreateSection()}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">
            {t('saveDialog.noteLabel')}
          </label>
          <textarea
            className="min-h-[100px] w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none"
            placeholder={t('saveDialog.notePlaceholder')}
            value={noteValue}
            onChange={(event) => setNoteValue(event.target.value)}
            maxLength={2000}
          />
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="left-0 top-0 h-dvh w-screen max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 pb-[env(safe-area-inset-bottom)] sm:left-1/2 sm:top-1/2 sm:max-h-[90vh] sm:w-full sm:max-w-md sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border sm:p-6">
        <div className="flex h-full flex-col overflow-hidden">
          <div className="border-b border-border px-6 py-4 sm:hidden">
            <p className="text-center text-base font-semibold">{t('saveDialog.title')}</p>
            <p className="mt-1 text-center text-xs text-muted-foreground">
              {t('saveDialog.description', { title: post.title ?? post.externalId })}
            </p>
          </div>
          <div className="hidden px-6 py-4 sm:block">
            <DialogHeader>
              <DialogTitle>{t('saveDialog.title')}</DialogTitle>
              <DialogDescription>
                {t('saveDialog.description', { title: post.title ?? post.externalId })}
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="flex-1 overflow-y-auto px-6 pb-4 pt-2 sm:px-6">{renderBody()}</div>
          {folders.length > 0 ? (
            <DialogFooter
              className={cn(
                'sticky bottom-0 flex border-t border-border bg-background/95 px-6 py-4 sm:static sm:bg-transparent sm:p-0',
                isRTL ? 'flex-row-reverse gap-3 sm:justify-start' : 'flex-row gap-3 sm:justify-end',
              )}
            >
              <Button
                type="button"
                variant="ghost"
                className="flex-1 sm:flex-none"
                onClick={() => onOpenChange(false)}
              >
                {t('saveDialog.cancel')}
              </Button>
              <Button
                type="button"
                className="flex-1 sm:flex-none"
                onClick={handleConfirm}
                disabled={
                  !selectedFolder ||
                  selectedFolderId === '__create__' ||
                  isSaving ||
                  isSavingNote ||
                  isDeletingNote
                }
              >
                {isSaving ? t('saveDialog.saving') : t('saveDialog.confirm')}
              </Button>
            </DialogFooter>
          ) : (
            <div className="px-6 pb-4 sm:p-0">
              <Button type="button" variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
                {t('saveDialog.cancel')}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
