'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Trash2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { SavedFolderEntry } from '@/types/ring-binder';

export type SavedFoldersDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: SavedFolderEntry[];
  isLoading: boolean;
  onRemove: (folderId: string) => Promise<void>;
  onAddMore: () => void;
};

export function SavedFoldersDialog({
  open,
  onOpenChange,
  folders,
  isLoading,
  onRemove,
  onAddMore,
}: SavedFoldersDialogProps) {
  const t = useTranslations('dashboard.posts.savedDialog');
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleRemove = async (folderId: string) => {
    setRemovingId(folderId);
    try {
      await onRemove(folderId);
    } finally {
      setRemovingId((current) => (current === folderId ? null : current));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t('loading')}</p>
        ) : folders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 p-4 text-center text-sm text-muted-foreground">
            {t('empty')}
          </div>
        ) : (
          <div className="space-y-3">
            {folders.map((folder) => (
              <div
                key={folder.id}
                className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-semibold text-foreground">{folder.folderName}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('savedAt', { date: new Date(folder.createdAt).toLocaleDateString() })}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon-sm"
                  onClick={() => handleRemove(folder.folderId)}
                  disabled={removingId === folder.folderId || isLoading}
                  aria-label={t('remove')}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
            ))}
          </div>
        )}
        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <Button type="button" variant="outline" onClick={onAddMore}>
            {t('addMore')}
          </Button>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {t('close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
