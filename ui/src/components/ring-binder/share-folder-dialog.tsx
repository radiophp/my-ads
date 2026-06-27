'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Share2, Trash2, UserPlus, UserX, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
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
import { LoadingLogo } from '@/components/ui/loading-logo';
import {
  useGetFolderSharesQuery,
  useShareFolderMutation,
  useRemoveFolderShareMutation,
  useRemoveUserFromSharesMutation,
} from '@/features/api/endpoints/ring-binder';
import {
  formatPhoneDisplay,
  sanitizeIranLocalPhone,
  isValidIranLocalPhone,
  toInternationalIranPhone,
} from '@/lib/phone-utils';

type ShareFolderDialogProps = {
  folderId: string;
  folderName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ShareFolderDialog({
  folderId,
  folderName,
  open,
  onOpenChange,
}: ShareFolderDialogProps) {
  const t = useTranslations('ringBinder');
  const [phone, setPhone] = useState('');

  const { data: shares = [], isLoading: sharesLoading } = useGetFolderSharesQuery(
    { folderId },
    { skip: !open },
  );
  const [shareFolder, { isLoading: isSharing }] = useShareFolderMutation();
  const [removeShare, { isLoading: isRemoving }] = useRemoveFolderShareMutation();
  const [removeUserFromAll, { isLoading: isRemovingAll }] = useRemoveUserFromSharesMutation();

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cursorPos = e.target.selectionStart ?? 0;
    const digitsBefore = e.target.value.slice(0, cursorPos).replace(/\D/g, '').length;
    const raw = e.target.value.replace(/\D/g, '').slice(0, 10);
    const formatted = formatPhoneDisplay(raw);

    let newCursor = 0;
    for (let digitsSeen = 0; digitsSeen < digitsBefore && newCursor < formatted.length; newCursor++) {
      if (formatted[newCursor] !== ' ') digitsSeen++;
    }

    setPhone(formatted);
    requestAnimationFrame(() => {
      e.target.setSelectionRange(newCursor, newCursor);
    });
  };

  const handleShare = async () => {
    const sanitized = sanitizeIranLocalPhone(phone);
    if (!isValidIranLocalPhone(sanitized)) {
      toast({
        title: t('share.shareNumberInvalid'),
        variant: 'destructive',
      });
      return;
    }
    try {
      await shareFolder({ folderId, phone: toInternationalIranPhone(sanitized) }).unwrap();
      toast({ title: t('share.shareSuccess') });
      setPhone('');
    } catch {
      toast({
        title: t('share.shareError'),
        variant: 'destructive',
      });
    }
  };

  const handleRemoveAccess = async (userId: string) => {
    try {
      await removeShare({ folderId, userId }).unwrap();
      toast({ title: t('share.removeSuccess') });
    } catch {
      toast({ title: t('share.removeError'), variant: 'destructive' });
    }
  };

  const handleRemoveFromAll = async (userId: string) => {
    try {
      const result = await removeUserFromAll({ userId }).unwrap();
      toast({
        title: t('share.removeAllSuccess', { count: result.deletedCount }),
      });
    } catch {
      toast({ title: t('share.removeError'), variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="size-5" />
            {t('share.title', { name: folderName })}
          </DialogTitle>
          <DialogDescription>{t('share.description')}</DialogDescription>
        </DialogHeader>

          <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-medium text-muted-foreground">
                +98
              </span>
              <Input
                value={phone}
                placeholder="912 888 88 88"
                onChange={handlePhoneChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void handleShare();
                  }
                }}
                inputMode="tel"
                autoComplete="tel-national"
                dir="ltr"
                className="pl-14 text-left"
              />
            </div>
            <Button
              type="button"
              onClick={() => void handleShare()}
              disabled={isSharing || !phone.trim()}
            >
              <UserPlus className="size-4" />
              {t('share.addButton')}
            </Button>
          </div>

          <div className="space-y-2">
            <p className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Users className="size-4" />
              {t('share.accessList')}
            </p>
            {sharesLoading ? (
              <LoadingLogo />
            ) : shares.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('share.noShares')}</p>
            ) : (
              <ul className="space-y-2">
                {shares.map((share) => (
                  <li
                    key={share.id}
                    className="flex items-center justify-between gap-2 rounded-lg border p-3"
                  >
                    <span className="dir-ltr text-sm font-medium text-foreground">
                      {share.sharedWithUser.phone}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveAccess(share.sharedWithUser.id)}
                        disabled={isRemoving}
                        title={t('share.removeFromThis')}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFromAll(share.sharedWithUser.id)}
                        disabled={isRemovingAll}
                        title={t('share.removeFromAll')}
                      >
                        <UserX className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('share.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
