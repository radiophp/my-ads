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
} from '@/features/api/apiSlice';

export type SaveToFolderDialogProps = {
  post: DivarPostSummary;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
};

type BaseQueryError = { status: number | string; data?: unknown };

const isBaseQueryError = (error: unknown): error is BaseQueryError =>
  typeof error === 'object' && error !== null && 'status' in error;

export function SaveToFolderDialog({ post, open, onOpenChange, onSaved }: SaveToFolderDialogProps) {
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

  useEffect(() => {
    if (!open) {
      setSelectedFolderId(null);
      return;
    }
    if (folders.length === 0) {
      setSelectedFolderId(null);
      return;
    }
    setSelectedFolderId((current) => {
      if (current && current !== '__create__' && folders.some((folder) => folder.id === current)) {
        return current;
      }
      return folders[0]?.id ?? null;
    });
  }, [open, folders]);

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
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('saveDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('saveDialog.description', { title: post.title ?? post.externalId })}
          </DialogDescription>
        </DialogHeader>
        {renderBody()}
        {folders.length > 0 ? (
          <DialogFooter className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t('saveDialog.cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={!selectedFolder || selectedFolderId === '__create__' || isSaving}
            >
              {isSaving ? t('saveDialog.saving') : t('saveDialog.confirm')}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
