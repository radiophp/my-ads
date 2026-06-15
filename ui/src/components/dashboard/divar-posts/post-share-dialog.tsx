'use client';

import type { JSX } from 'react';
import type { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Copy, MessageCircle, MessageSquare, Send } from 'lucide-react';

type SharePostDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  t: ReturnType<typeof useTranslations>;
  onShareWhatsapp?: () => void;
  onShareTelegram?: () => void;
  smsHref?: string | null;
  onCopyLink?: () => void;
  copyLinkLabel?: string;
};

export function SharePostDialog({
  open,
  onOpenChange,
  t,
  onShareWhatsapp,
  onShareTelegram,
  smsHref,
  onCopyLink,
  copyLinkLabel,
}: SharePostDialogProps): JSX.Element {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" hideCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t('sharePost')}</DialogTitle>
          <DialogDescription className="sr-only">
            {t('sharePost')}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          {onShareWhatsapp ? (
            <Button
              type="button"
              variant="outline"
              className="flex items-center gap-2"
              onClick={() => {
                onShareWhatsapp();
                onOpenChange(false);
              }}
            >
              <MessageCircle className="text-green-600" />
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
                onOpenChange(false);
              }}
            >
              <Send className="text-sky-500" />
              <span>{t('shareTelegram')}</span>
            </Button>
          ) : null}
          {smsHref ? (
            <Button
              asChild
              variant="outline"
              className="flex items-center gap-2 sm:hidden"
            >
              <a href={smsHref} onClick={() => onOpenChange(false)}>
                <MessageSquare className="text-primary" />
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
                onOpenChange(false);
              }}
            >
              <Copy />
              <span>{copyLinkLabel ?? t('copyLink')}</span>
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
