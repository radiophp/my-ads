'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ExternalLink, Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { Link } from '@/i18n/routing';
import {
  useCreateRingBinderFolderMutation,
  useDeleteRingBinderFolderMutation,
  useGetRingBinderFoldersQuery,
  useUpdateRingBinderFolderMutation,
} from '@/features/api/apiSlice';
import type { RingBinderFolder } from '@/types/ring-binder';

const DEFAULT_MAX_FOLDERS = 30;

export function RingBinderPanel() {
  const t = useTranslations('ringBinder');
  const locale = useLocale();
  const [folderName, setFolderName] = useState('');
  const { data, isLoading, isFetching, isError } = useGetRingBinderFoldersQuery();
  const [createFolder, { isLoading: isCreating }] = useCreateRingBinderFolderMutation();
  const [updateFolder, { isLoading: isRenaming }] = useUpdateRingBinderFolderMutation();
  const [deleteFolder, { isLoading: isDeleting }] = useDeleteRingBinderFolderMutation();
  const [folderToRename, setFolderToRename] = useState<RingBinderFolder | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [folderToDelete, setFolderToDelete] = useState<RingBinderFolder | null>(null);

  const folders = data?.folders ?? [];
  const maxFolders = data?.maxFolders ?? DEFAULT_MAX_FOLDERS;
  const isAtLimit = folders.length >= maxFolders;

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
      }),
    [locale],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = folderName.trim();
    if (!trimmedName || isAtLimit || isCreating) {
      return;
    }
    try {
      await createFolder({ name: trimmedName }).unwrap();
      setFolderName('');
      toast({
        title: t('toast.successTitle'),
        description: t('toast.successDescription', { name: trimmedName }),
      });
    } catch (error) {
      console.error('Failed to create folder', error);
      toast({
        title: t('toast.errorTitle'),
        description: t('toast.errorDescription'),
        variant: 'destructive',
      });
    }
  };

  const handleRenameSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!folderToRename) {
      return;
    }
    const trimmed = renameValue.trim();
    if (!trimmed || isRenaming) {
      return;
    }
    try {
      await updateFolder({ id: folderToRename.id, name: trimmed }).unwrap();
      toast({
        title: t('toast.renameSuccessTitle'),
        description: t('toast.renameSuccessDescription', { name: trimmed }),
      });
      setFolderToRename(null);
      setRenameValue('');
    } catch (error) {
      console.error('Failed to rename folder', error);
      toast({
        title: t('toast.errorTitle'),
        description: t('toast.renameErrorDescription'),
        variant: 'destructive',
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!folderToDelete || isDeleting) {
      return;
    }
    try {
      await deleteFolder(folderToDelete.id).unwrap();
      toast({
        title: t('toast.deleteSuccessTitle'),
        description: t('toast.deleteSuccessDescription', { name: folderToDelete.name }),
      });
      setFolderToDelete(null);
    } catch (error) {
      console.error('Failed to delete folder', error);
      toast({
        title: t('toast.errorTitle'),
        description: t('toast.deleteErrorDescription'),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="w-full px-4 py-6 sm:px-6 sm:py-10">
      <div className="flex w-full flex-col gap-6">
        <div className="space-y-2">
          <div>
            <h1 className="mt-2 text-2xl font-semibold text-foreground sm:text-3xl">
              {t('title')}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{t('description')}</p>
          </div>
        </div>
        <Card className="border border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">
              {t('form.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-3 sm:flex-row"
            >
              <Input
                value={folderName}
                onChange={(event) => setFolderName(event.target.value)}
                placeholder={t('form.placeholder')}
                disabled={isCreating || isAtLimit}
                maxLength={64}
              />
              <Button
                type="submit"
                disabled={isCreating || isAtLimit || folderName.trim().length === 0}
              >
                {isCreating ? t('form.creating') : t('form.submit')}
              </Button>
            </form>
            <p className="mt-2 text-xs text-muted-foreground">
              {t('form.limitHelper', { count: folders.length, max: maxFolders })}
            </p>
            {isAtLimit ? (
              <p className="mt-1 text-xs font-medium text-destructive">{t('form.limitReached')}</p>
            ) : null}
          </CardContent>
        </Card>
        <Card className="border border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">
              {t('list.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-20 animate-pulse rounded-2xl border border-border/50 bg-muted/40"
                  />
                ))}
              </div>
            ) : isError ? (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                {t('list.error')}
              </div>
            ) : folders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/70 p-6 text-center">
                <p className="text-base font-semibold text-foreground">{t('list.emptyTitle')}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t('list.emptyDescription')}</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    className="rounded-2xl border border-border/70 p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-base font-semibold text-foreground">{folder.name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>
                            {t('list.savedCount', {
                              count: (folder.savedPostCount ?? 0).toLocaleString(locale),
                            })}
                          </span>
                          <span aria-hidden="true">•</span>
                          <span>
                            {t('list.createdAt', {
                              date: dateFormatter.format(new Date(folder.createdAt)),
                            })}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          asChild
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          aria-label={t('actions.view')}
                        >
                          <Link href={`/dashboard?ringFolderId=${folder.id}`}>
                            <ExternalLink className="size-4" aria-hidden />
                          </Link>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          aria-label={t('actions.rename')}
                          onClick={() => {
                            setFolderToRename(folder);
                            setRenameValue(folder.name);
                          }}
                        >
                          <Pencil className="size-4" aria-hidden />
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon-sm"
                          aria-label={t('actions.delete')}
                          onClick={() => setFolderToDelete(folder)}
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {isFetching && !isLoading ? (
              <p className="mt-3 text-xs text-muted-foreground">{t('list.refreshing')}</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
      <Dialog
        open={Boolean(folderToRename)}
        onOpenChange={(open) => {
          if (!open) {
            setFolderToRename(null);
            setRenameValue('');
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('renameDialog.title')}</DialogTitle>
            <DialogDescription>{t('renameDialog.description')}</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleRenameSubmit}>
            <Input
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              maxLength={64}
              disabled={isRenaming}
              autoFocus
            />
            <DialogFooter className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setFolderToRename(null);
                  setRenameValue('');
                }}
                disabled={isRenaming}
              >
                {t('deleteDialog.cancel')}
              </Button>
              <Button type="submit" disabled={isRenaming || renameValue.trim().length === 0}>
                {isRenaming ? t('renameDialog.saving') : t('renameDialog.submit')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(folderToDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setFolderToDelete(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('deleteDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('deleteDialog.description', { name: folderToDelete?.name ?? '' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setFolderToDelete(null)}
              disabled={isDeleting}
            >
              {t('deleteDialog.cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? t('deleteDialog.confirming') : t('deleteDialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
