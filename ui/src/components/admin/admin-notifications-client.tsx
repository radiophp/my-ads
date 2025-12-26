'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { useSendTestNotificationMutation } from '@/features/api/apiSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Switch } from '@/components/ui/switch';

export function AdminNotificationsClient() {
  const t = useTranslations('admin.notifications');
  const { toast } = useToast();
  const [userId, setUserId] = useState('f0f990a1-c0e3-4369-849d-f2db8c198c8f');
  const [savedFilterId, setSavedFilterId] = useState('14bcc6a9-01f6-4f55-8a4d-bb5b5e68393d');
  const [postCode, setPostCode] = useState('355325');
  const [message, setMessage] = useState('');
  const [sendTelegram, setSendTelegram] = useState(false);
  const [sendTest, { isLoading }] = useSendTestNotificationMutation();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedPostCode = postCode.trim();
    const parsedPostCode = Number(trimmedPostCode);

    if (!userId || !savedFilterId || !trimmedPostCode || !Number.isFinite(parsedPostCode)) {
      toast({
        title: t('errors.missing'),
        description: t('errors.required'),
        variant: 'destructive',
      });
      return;
    }
    try {
      const result = await sendTest({
        userId: userId.trim(),
        savedFilterId: savedFilterId.trim(),
        postCode: parsedPostCode,
        message: message.trim() || undefined,
        sendTelegram,
      }).unwrap();
      toast({
        title: t('toast.successTitle'),
        description: t('toast.successDescription', {
          id: result.notificationId,
          tg: sendTelegram
            ? result.telegramSent
              ? t('toast.telegramSent')
              : result.telegramQueued
                ? t('toast.telegramQueued')
                : t('toast.telegramNotSent')
            : t('toast.telegramSkipped'),
        }),
      });
    } catch (error) {
      toast({
        title: t('toast.errorTitle'),
        description: t('toast.errorDescription'),
        variant: 'destructive',
      });
      console.error('Failed to send test notification', error);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 md:py-12">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-primary">{t('badge')}</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {t('title')}
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">{t('description')}</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-card space-y-4 rounded-xl border border-border/60 p-4 shadow-sm">
        <div className="space-y-2">
          <Label htmlFor="user-id">{t('fields.userId')}</Label>
          <Input
            id="user-id"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="UUID"
            required
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="saved-filter-id">{t('fields.savedFilterId')}</Label>
          <Input
            id="saved-filter-id"
            value={savedFilterId}
            onChange={(e) => setSavedFilterId(e.target.value)}
            placeholder="UUID"
            required
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="post-code">{t('fields.postCode')}</Label>
          <Input
            id="post-code"
            type="number"
            inputMode="numeric"
            min={1000}
            value={postCode}
            onChange={(e) => setPostCode(e.target.value)}
            placeholder={t('fields.postCodePlaceholder')}
            required
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="message">{t('fields.message')}</Label>
          <Input
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t('fields.messagePlaceholder')}
            autoComplete="off"
          />
        </div>
        <div className="flex items-center justify-between rounded-md border border-border/60 bg-muted/20 px-3 py-2">
          <div className="space-y-1">
            <Label htmlFor="send-telegram" className="text-sm font-medium">
              {t('fields.sendTelegram')}
            </Label>
            <p className="text-xs text-muted-foreground">{t('fields.sendTelegramHelper')}</p>
          </div>
          <Switch
            id="send-telegram"
            checked={sendTelegram}
            onCheckedChange={setSendTelegram}
            aria-label={t('fields.sendTelegram')}
          />
        </div>
        <div className="flex justify-end gap-3">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? t('actions.sending') : t('actions.send')}
          </Button>
        </div>
      </form>

      <div className="rounded-lg border border-dashed border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground">{t('tips.title')}</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>{t('tips.item1')}</li>
          <li>{t('tips.item2')}</li>
          <li>{t('tips.item3')}</li>
        </ul>
      </div>
    </div>
  );
}
