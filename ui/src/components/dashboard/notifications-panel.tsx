'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Bell, RefreshCw } from 'lucide-react';

import {
  useGetNotificationsQuery,
  useLazyGetNotificationsQuery,
} from '@/features/api/apiSlice';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import {
  appendNotifications,
  replaceNotifications,
  type NotificationsState,
} from '@/features/notifications/notificationsSlice';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import {
  canUseNativeNotifications,
  getNotificationPermission,
  requestNotificationPermission,
} from '@/features/notifications/nativeNotifications';
import { usePushSubscription } from '@/features/notifications/usePushSubscription';
import { useToast } from '@/components/ui/use-toast';

const PAGE_SIZE = 20;
type NotificationsTranslator = ReturnType<typeof useTranslations<'dashboard.notificationsPage'>>;

export function NotificationsPanel() {
  const t = useTranslations('dashboard.notificationsPage');
  const locale = useLocale();
  const dispatch = useAppDispatch();
  const notificationsState = useAppSelector((state) => state.notifications);
  const { data, isLoading, isFetching, refetch } = useGetNotificationsQuery({ limit: PAGE_SIZE });
  const [fetchMore, { isLoading: isLoadingMore }] = useLazyGetNotificationsQuery();
  const [permission, setPermission] = useState<NotificationPermission>(
    canUseNativeNotifications() ? getNotificationPermission() : 'denied',
  );
  const { subscribe: subscribePush, supported: pushSupported, isLoading: pushLoading } = usePushSubscription();
  const { toast } = useToast();

  useEffect(() => {
    if (!data) {
      return;
    }
    dispatch(
      replaceNotifications({
        items: data.items,
        nextCursor: data.nextCursor,
        hasMore: data.hasMore,
      }),
    );
  }, [data, dispatch]);

  const handleRefresh = () => {
    refetch();
  };

  const handleEnableDeviceNotifications = async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
  };

  const handleEnablePush = async () => {
    try {
      await subscribePush();
      toast({ title: t('push.enabledTitle'), description: t('push.enabledDescription') });
    } catch (error) {
      toast({
        title: t('push.errorTitle'),
        description: t('push.errorDescription'),
        variant: 'destructive',
      });
      console.error(error);
    }
  };

  const handleLoadMore = async () => {
    if (!notificationsState.lastCursor) {
      return;
    }
    try {
      const result = await fetchMore({ cursor: notificationsState.lastCursor, limit: PAGE_SIZE }).unwrap();
      dispatch(
        appendNotifications({
          items: result.items,
          nextCursor: result.nextCursor,
          hasMore: result.hasMore,
        }),
      );
    } catch (error) {
      console.error('Failed to load more notifications', error);
    }
  };

  const busy = isLoading || isFetching;
  const connectionBadge = useMemo(() => {
    return notificationsState.connected
      ? t('realtime.online')
      : t('realtime.offline');
  }, [notificationsState.connected, t]);

  return (
    <div className="min-h-[70vh] w-full bg-background px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <header className="flex flex-col gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 px-3 py-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">
            <Bell className="size-3.5" aria-hidden />
            {t('badge')}
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t('title')}</h1>
            <p className="text-base text-muted-foreground">{t('description')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium',
                notificationsState.connected
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : 'bg-amber-500/10 text-amber-600',
              )}
            >
              <span className="relative inline-flex size-2.5">
                <span
                  className={cn(
                    'absolute inline-flex size-full rounded-full bg-current opacity-75',
                    notificationsState.connected && 'animate-ping',
                  )}
                />
                <span className="relative inline-flex size-2.5 rounded-full bg-current" />
              </span>
              {connectionBadge}
            </span>
            {notificationsState.lastError ? (
              <span className="text-xs text-destructive">{t('realtime.error', { message: notificationsState.lastError })}</span>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={busy}
              className="inline-flex items-center gap-2"
            >
              <RefreshCw className={cn('size-4', busy && 'animate-spin')} aria-hidden />
              {busy ? t('refreshing') : t('refresh')}
            </Button>
            {permission !== 'granted' && canUseNativeNotifications() ? (
              <Button
                type="button"
                size="sm"
                onClick={() => void handleEnableDeviceNotifications()}
                variant="secondary"
                className="inline-flex items-center gap-2"
              >
                {t('enableDeviceNotifications', { default: 'Enable device notifications' })}
              </Button>
            ) : null}
            {pushSupported ? (
              <Button
                type="button"
                size="sm"
                onClick={() => void handleEnablePush()}
                disabled={pushLoading}
                variant="secondary"
                className="inline-flex items-center gap-2"
              >
                {pushLoading ? t('push.enabling') : t('push.enable')}
              </Button>
            ) : null}
          </div>
        </header>

        {busy ? (
          <NotificationsSkeleton />
        ) : notificationsState.items.length === 0 ? (
          <EmptyState title={t('emptyTitle')} description={t('emptyDescription')} />
        ) : (
          <ul className="space-y-4">
            {notificationsState.items.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                locale={locale}
                t={t}
              />
            ))}
          </ul>
        )}

        {notificationsState.hasMore && notificationsState.lastCursor ? (
          <div className="flex justify-center">
            <Button
              type="button"
              variant="secondary"
              onClick={() => void handleLoadMore()}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? t('loadingMore') : t('loadMore')}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function NotificationsSkeleton() {
  const skeletonKeys = ['one', 'two', 'three'];
  return (
    <div className="space-y-4">
      {skeletonKeys.map((key) => (
        <div key={key} className="bg-card/50 animate-pulse rounded-2xl border border-border/70 p-4">
          <div className="h-5 w-1/3 rounded bg-muted" />
          <div className="mt-2 h-4 w-1/4 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

type EmptyStateProps = {
  title: string;
  description: string;
};

function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-border/70 bg-muted/30 px-6 py-10 text-center">
      <Bell className="mx-auto mb-3 size-8 text-muted-foreground" aria-hidden />
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

type NotificationCardProps = {
  notification: NotificationsState['items'][number];
  locale: string;
  t: NotificationsTranslator;
};

function NotificationCard({ notification, locale, t }: NotificationCardProps) {
  const createdAt = new Date(notification.createdAt).toLocaleString(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const statusLabel = t(`status.${notification.status.toLowerCase() as 'pending' | 'sent' | 'failed'}`);
  const statusColor =
    notification.status === 'SENT'
      ? 'text-emerald-600 bg-emerald-500/10'
      : notification.status === 'FAILED'
        ? 'text-destructive bg-destructive/10'
        : 'text-amber-600 bg-amber-500/10';

  const location = [notification.post.districtName, notification.post.cityName, notification.post.provinceName]
    .filter(Boolean)
    .join('، ');

  const detailHref = `/dashboard/posts/${notification.post.id}`;

  return (
    <li className="bg-card/50 flex flex-col gap-4 rounded-2xl border border-border/70 p-4 shadow-sm">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', statusColor)}>
            {statusLabel}
          </span>
          <span>{t('item.savedFilter', { name: notification.filter.name })}</span>
        </div>
        <h3 className="text-lg font-semibold text-foreground">
          {notification.post.title ?? t('item.untitled')}
        </h3>
        {notification.message ? (
          <p className="text-sm text-muted-foreground">{notification.message}</p>
        ) : null}
        {location ? <p className="text-sm text-muted-foreground">{location}</p> : null}
        <p className="text-xs text-muted-foreground">{t('item.receivedAt', { value: createdAt })}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline">
          <Link href={detailHref}>{t('item.viewPost')}</Link>
        </Button>
      </div>
    </li>
  );
}
