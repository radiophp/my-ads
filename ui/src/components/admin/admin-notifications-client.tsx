'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { useSendTestNotificationMutation } from '@/features/api/apiSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

export function AdminNotificationsClient() {
  const t = useTranslations('admin.notifications');
  const { toast } = useToast();
  const [userId, setUserId] = useState('');
  const [savedFilterId, setSavedFilterId] = useState('');
  const [postId, setPostId] = useState('');
  const [message, setMessage] = useState('');
  const [sendTest, { isLoading }] = useSendTestNotificationMutation();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!userId || !savedFilterId || !postId) {
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
        postId: postId.trim(),
        message: message.trim() || undefined,
      }).unwrap();
      toast({
        title: t('toast.successTitle'),
        description: t('toast.successDescription', { id: result.notificationId }),
      });
    } catch (error) {
      toast({
        title: t('toast.errorTitle'),
        description: t('toast.errorDescription'),
        variant: 'destructive',
      });
      // eslint-disable-next-line no-console
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

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border/60 bg-card p-4 shadow-sm">
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
          <Label htmlFor="post-id">{t('fields.postId')}</Label>
          <Input
            id="post-id"
            value={postId}
            onChange={(e) => setPostId(e.target.value)}
            placeholder="UUID"
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
