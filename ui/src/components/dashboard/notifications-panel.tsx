'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Bell, ChevronDown, ExternalLink, Loader2, RefreshCw } from 'lucide-react';

import {
  useFetchPostContactInfoMutation,
  useGetDivarPostQuery,
  useGetNotificationsQuery,
  useLazyGetNotificationsQuery,
  useMarkNotificationReadMutation,
} from '@/features/api/apiSlice';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import {
  appendNotifications,
  markNotificationRead as markNotificationReadAction,
  replaceNotifications,
  type NotificationsState,
} from '@/features/notifications/notificationsSlice';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  canUseNativeNotifications,
  getNotificationPermission,
  requestNotificationPermission,
} from '@/features/notifications/nativeNotifications';
import { usePushSubscription } from '@/features/notifications/usePushSubscription';
import { useNotificationPreferences } from '@/features/notifications/useNotificationPreferences';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DownloadPhotosDialog } from '@/components/dashboard/divar-posts/download-photos-dialog';
import { buildPostDetailData } from '@/components/dashboard/divar-posts/post-detail-data';
import { PostDetailView } from '@/components/dashboard/divar-posts/post-detail-view';
import { getBusinessTypeBadge } from '@/components/dashboard/divar-posts/business-badge';
import { useToast } from '@/components/ui/use-toast';
import type { DivarPostContactInfo, DivarPostSummary } from '@/types/divar-posts';
import { PostCard } from '@/components/dashboard/divar-posts/post-card';

const PAGE_SIZE = 20;
type NotificationsTranslator = ReturnType<typeof useTranslations<'dashboard.notificationsPage'>>;
type PushStatus = 'checking' | 'active' | 'inactive' | 'blocked' | 'unsupported';

export function NotificationsPanel() {
  const t = useTranslations('dashboard.notificationsPage');
  const postT = useTranslations('dashboard.posts');
  const locale = useLocale();
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const notificationsState = useAppSelector((state) => state.notifications);
  const { data, isLoading, isFetching, refetch } = useGetNotificationsQuery({ limit: PAGE_SIZE });
  const [fetchMore, { isLoading: isLoadingMore }] = useLazyGetNotificationsQuery();
  const [fetchContactInfo] = useFetchPostContactInfoMutation();
  const [markNotificationRead] = useMarkNotificationReadMutation();
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [contactInfo, setContactInfo] = useState<DivarPostContactInfo | null>(null);
  const [contactLoading, setContactLoading] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const isAutoLoadingRef = useRef(false);
  const [permission, setPermission] = useState<NotificationPermission>(
    canUseNativeNotifications() ? getNotificationPermission() : 'denied',
  );
  const [selectedFilterId, setSelectedFilterId] = useState<string>('');
  const [readFilter, setReadFilter] = useState<'all' | 'read' | 'unread'>('all');
  const [pushStatus, setPushStatus] = useState<PushStatus>('checking');
  const { supported: pushSupported } = usePushSubscription();
  const { pushEnabled } = useNotificationPreferences();
  const { data: selectedPost, isLoading: isPostLoading, isFetching: isPostFetching, isError: isPostError } =
    useGetDivarPostQuery(selectedPostId ?? '', { skip: !selectedPostId });

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

  const refreshPushStatus = useCallback(async () => {
    if (!pushSupported) {
      setPushStatus('unsupported');
      return;
    }

    const currentPermission = getNotificationPermission();
    setPermission(currentPermission);

    if (currentPermission === 'denied') {
      setPushStatus('blocked');
      return;
    }
    if (!pushEnabled) {
      setPushStatus('inactive');
      return;
    }
    if (currentPermission !== 'granted') {
      setPushStatus('inactive');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        setPushStatus('inactive');
        return;
      }
      const subscription = await registration.pushManager.getSubscription();
      setPushStatus(subscription ? 'active' : 'inactive');
    } catch {
      setPushStatus('inactive');
    }
  }, [pushEnabled, pushSupported]);

  useEffect(() => {
    const handleFocus = () => {
      void refreshPushStatus();
    };
    handleFocus();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refreshPushStatus]);

  const handleRefresh = () => {
    refetch();
  };

  const handleEnableDeviceNotifications = async () => {
    const result = await requestNotificationPermission();
    setPermission(result);
    await refreshPushStatus();
  };

  const handleLoadMore = useCallback(async () => {
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
  }, [dispatch, fetchMore, notificationsState.lastCursor]);

  const busy = isLoading || isFetching;
  const canLoadMore = notificationsState.hasMore && Boolean(notificationsState.lastCursor);
  const connectionBadge = useMemo(() => {
    return notificationsState.connected
      ? t('realtime.online')
      : t('realtime.offline');
  }, [notificationsState.connected, t]);
  const pushBadgeLabel = useMemo(() => t(`push.status.${pushStatus}`), [pushStatus, t]);
  const pushBadgeColor = useMemo(() => {
    if (pushStatus === 'active') {
      return 'bg-emerald-500/10 text-emerald-500';
    }
    if (pushStatus === 'blocked') {
      return 'bg-destructive/10 text-destructive';
    }
    if (pushStatus === 'unsupported') {
      return 'bg-muted text-muted-foreground';
    }
    if (pushStatus === 'checking') {
      return 'bg-muted text-muted-foreground';
    }
    return 'bg-amber-500/10 text-amber-600';
  }, [pushStatus]);
  const isRTL = locale === 'fa';

  const filterOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of notificationsState.items) {
      if (item.filter?.id && item.filter?.name) {
        map.set(item.filter.id, item.filter.name);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [notificationsState.items]);

  const filteredItems = useMemo(() => {
    let items = notificationsState.items;
    if (selectedFilterId) {
      items = items.filter((item) => item.filter?.id === selectedFilterId);
    }
    if (readFilter === 'read') {
      items = items.filter((item) => Boolean(item.readAt));
    } else if (readFilter === 'unread') {
      items = items.filter((item) => !item.readAt);
    }
    return items;
  }, [notificationsState.items, readFilter, selectedFilterId]);

  useEffect(() => {
    if (!canLoadMore) {
      return;
    }
    const target = loadMoreRef.current;
    if (!target) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) {
          return;
        }
        if (busy || isLoadingMore || isAutoLoadingRef.current) {
          return;
        }
        isAutoLoadingRef.current = true;
        void handleLoadMore().finally(() => {
          isAutoLoadingRef.current = false;
        });
      },
      { root: null, rootMargin: '200px 0px', threshold: 0.1 },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [busy, canLoadMore, handleLoadMore, isLoadingMore]);

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        maximumFractionDigits: 0,
      }),
    [locale],
  );

  const relativeFormatter = useMemo(
    () =>
      new Intl.RelativeTimeFormat(locale, {
        numeric: 'auto',
      }),
    [locale],
  );

  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        maximumFractionDigits: 2,
      }),
    [locale],
  );

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    [locale],
  );

  const formatPrice = useCallback(
    (value: number | string | null | undefined): string | null => {
      const numeric =
        typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : null;
      if (numeric === null || Number.isNaN(numeric) || numeric <= 0) {
        return null;
      }
      return currencyFormatter.format(numeric);
    },
    [currencyFormatter],
  );

  const getRelativeLabel = useCallback(
    (iso: string | null | undefined, fallbackJalali?: string | null) => {
      if (iso) {
        const date = new Date(iso);
        const diffMs = date.getTime() - Date.now();
        const divisions: Array<{ amount: number; unit: Intl.RelativeTimeFormatUnit }> = [
          { amount: 60, unit: 'second' },
          { amount: 60, unit: 'minute' },
          { amount: 24, unit: 'hour' },
          { amount: 7, unit: 'day' },
          { amount: 4.34524, unit: 'week' },
          { amount: 12, unit: 'month' },
          { amount: Number.POSITIVE_INFINITY, unit: 'year' },
        ];

        let duration = diffMs / 1000;
        for (const division of divisions) {
          if (Math.abs(duration) < division.amount) {
            return relativeFormatter.format(Math.round(duration), division.unit);
          }
          duration /= division.amount;
        }
      }

      if (fallbackJalali) {
        return fallbackJalali;
      }

      return null;
    },
    [relativeFormatter],
  );

  const detailData = useMemo(() => {
    if (!selectedPost) {
      return null;
    }
    return buildPostDetailData({
      post: selectedPost,
      t: postT,
      formatPrice,
      numberFormatter,
    });
  }, [formatPrice, numberFormatter, postT, selectedPost]);

  const businessBadge = useMemo(
    () => (selectedPost ? getBusinessTypeBadge(selectedPost.businessType ?? null, postT) : null),
    [postT, selectedPost],
  );

  const publishedDisplay = useMemo(() => {
    if (!selectedPost) {
      return null;
    }
    if (selectedPost.publishedAt) {
      return dateFormatter.format(new Date(selectedPost.publishedAt));
    }
    return selectedPost.publishedAtJalali ?? postT('labels.notAvailable');
  }, [dateFormatter, postT, selectedPost]);

  const cityDistrict = useMemo(() => {
    if (!selectedPost) {
      return null;
    }
    if (selectedPost.districtName || selectedPost.cityName) {
      return [selectedPost.districtName, selectedPost.cityName].filter(Boolean).join('، ');
    }
    return null;
  }, [selectedPost]);

  const hasDownloadableMedia = Boolean(
    selectedPost && (selectedPost.medias.length > 0 || selectedPost.imageUrl),
  );

  const handleOpenDownloadDialog = useCallback(() => {
    if (hasDownloadableMedia) {
      setDownloadDialogOpen(true);
    }
  }, [hasDownloadableMedia]);

  useEffect(() => {
    setDownloadDialogOpen(false);
    setContactInfo(null);
    setContactLoading(false);
  }, [selectedPost?.id]);

  const handleFetchContactInfo = useCallback(async () => {
    if (!selectedPost) {
      return;
    }
    setContactLoading(true);
    try {
      const result = await fetchContactInfo({ postId: selectedPost.id }).unwrap();
      setContactInfo(result);
      if (!result.phoneNumber) {
        toast({
          title: postT('contactInfo.missingTitle'),
          description: postT('contactInfo.missingDescription'),
        });
      }
    } catch (error: unknown) {
      const fetchError = error as {
        status?: number;
        originalStatus?: number;
        data?: { retryAfterSeconds?: number };
      };
      const status = fetchError?.status ?? fetchError?.originalStatus;
      if (status === 429) {
        const retrySeconds = Number(fetchError?.data?.retryAfterSeconds ?? 0);
        const minutes = Math.floor(retrySeconds / 60);
        const seconds = Math.max(retrySeconds % 60, 0);
        const timeLabel =
          minutes > 0 ? `${minutes}m ${seconds.toString().padStart(2, '0')}s` : `${seconds}s`;
        toast({
          title: postT('contactInfo.rateLimitedTitle'),
          description: postT('contactInfo.rateLimitedDescription', { time: timeLabel }),
          variant: 'destructive',
        });
      } else {
        console.error('Failed to fetch contact info', error);
        toast({
          title: postT('contactInfo.errorTitle'),
          description: postT('contactInfo.errorDescription'),
          variant: 'destructive',
        });
      }
    } finally {
      setContactLoading(false);
    }
  }, [fetchContactInfo, postT, selectedPost, toast]);

  const openPostModal = useCallback(
    async (postId: string, notificationId: string, readAt: string | null) => {
      setSelectedPostId(postId);
      setDialogOpen(true);
      if (readAt) {
        return;
      }
      try {
        await markNotificationRead({ notificationId }).unwrap();
        dispatch(markNotificationReadAction({ id: notificationId, readAt: new Date().toISOString() }));
      } catch (error) {
        console.error('Failed to mark notification read', error);
      }
    },
    [dispatch, markNotificationRead],
  );

  const closeDialog = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setSelectedPostId(null);
      setContactInfo(null);
      setContactLoading(false);
    }
  }, []);

  const dialogTitle = selectedPost
    ? selectedPost.title ?? postT('untitled', { externalId: selectedPost.externalId })
    : postT('loading');
  const postLoading = isPostLoading || isPostFetching;

  return (
    <div className="min-h-[70vh] w-full bg-background px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <header className="bg-card/50 rounded-2xl border border-border/60 p-4 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className={cn('flex flex-col gap-2', isRTL ? 'text-right' : 'text-left')}>
              <div
                className={cn(
                  'flex flex-nowrap items-center gap-2',
                  isRTL ? 'justify-end' : 'justify-start',
                )}
              >
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
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium',
                    pushBadgeColor,
                  )}
                >
                  {pushBadgeLabel}
                </span>
              </div>
              {notificationsState.lastError ? (
                <span className="text-xs text-destructive">
                  {t('realtime.error', { message: notificationsState.lastError })}
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:justify-end">
              {permission !== 'granted' && canUseNativeNotifications() ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void handleEnableDeviceNotifications()}
                  variant="secondary"
                  className="inline-flex items-center gap-2 text-sm"
                >
                  {t('enableDeviceNotifications', { default: 'Enable device notifications' })}
                </Button>
              ) : null}
              {permission === 'denied' && canUseNativeNotifications() ? (
                <span>{t('push.permissionDenied')}</span>
              ) : null}
            </div>
          </div>
          <div className="mt-4 border-t border-border/60 pt-4">
            <div
              className={cn(
                'flex flex-col gap-2 md:flex-row md:flex-nowrap md:items-center md:justify-between',
                isRTL ? 'text-right' : 'text-left',
              )}
            >
              <div
                className={cn(
                  'flex flex-wrap items-center gap-2 md:flex-nowrap',
                  isRTL ? 'md:order-2 md:justify-end' : 'md:order-1 md:justify-start',
                )}
              >
                <label className="sr-only">{t('filter.label')}</label>
                <div className="relative w-full md:w-[320px]">
                  <select
                    className={cn(
                      'w-full appearance-none rounded-lg border border-border/60 bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                      isRTL ? 'pl-10 pr-3 text-right' : 'pl-3 pr-10 text-left',
                    )}
                    value={selectedFilterId}
                    onChange={(event) => setSelectedFilterId(event.target.value)}
                    disabled={filterOptions.length === 0}
                  >
                    <option value="">{t('filter.all')}</option>
                    {filterOptions.map((filter) => (
                      <option key={filter.id} value={filter.id}>
                        {filter.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    aria-hidden="true"
                    className={cn(
                      'pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground',
                      isRTL ? 'left-3' : 'right-3',
                    )}
                  />
                </div>
                <label className="sr-only">{t('readFilter.label')}</label>
                <div className="relative w-full md:w-[180px]">
                  <select
                    className={cn(
                      'w-full appearance-none rounded-lg border border-border/60 bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                      isRTL ? 'pl-10 pr-3 text-right' : 'pl-3 pr-10 text-left',
                    )}
                    value={readFilter}
                    onChange={(event) => setReadFilter(event.target.value as typeof readFilter)}
                  >
                    <option value="all">{t('readFilter.all')}</option>
                    <option value="unread">{t('readFilter.unread')}</option>
                    <option value="read">{t('readFilter.read')}</option>
                  </select>
                  <ChevronDown
                    aria-hidden="true"
                    className={cn(
                      'pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground',
                      isRTL ? 'left-3' : 'right-3',
                    )}
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={busy}
                className={cn(
                  'inline-flex w-full items-center gap-2 md:w-auto md:flex-none',
                  isRTL ? 'md:order-1' : 'md:order-2',
                )}
              >
                <RefreshCw className={cn('size-4', busy && 'animate-spin')} aria-hidden />
                {busy ? t('refreshing') : t('refresh')}
              </Button>
            </div>
          </div>
          <div
            className={cn(
              'mt-4 rounded-xl border border-border/60 bg-muted/40 px-4 py-3 text-sm text-muted-foreground',
              isRTL ? 'text-right' : 'text-left',
            )}
          >
            <span className="font-medium text-foreground">{t('retentionNotice.title')}</span>
            <p className="mt-1">{t('retentionNotice.body')}</p>
          </div>
        </header>

        {busy ? (
          <NotificationsSkeleton />
        ) : filteredItems.length === 0 ? (
          <EmptyState title={t('emptyTitle')} description={t('emptyDescription')} />
        ) : (
          <div className="grid w-full auto-rows-fr grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                t={t}
                postT={postT}
                formatPrice={formatPrice}
                getRelativeLabel={getRelativeLabel}
                dateFormatter={dateFormatter}
                onViewPost={openPostModal}
              />
            ))}
          </div>
        )}

        {canLoadMore ? (
          <div ref={loadMoreRef} className="flex justify-center py-6">
            {isLoadingMore ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                <span>{t('loadingMore')}</span>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent
          hideCloseButton
          className="left-0 top-0 h-dvh w-screen max-w-none translate-x-0 translate-y-0 rounded-none border-0 p-0 pb-[env(safe-area-inset-bottom)] sm:left-1/2 sm:top-1/2 sm:flex sm:max-h-[90vh] sm:w-full sm:max-w-[1200px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:flex-col sm:overflow-hidden sm:rounded-2xl sm:p-8"
          onPointerDownOutside={(event) => {
            if (downloadDialogOpen) {
              event.preventDefault();
            }
          }}
          onInteractOutside={(event) => {
            if (downloadDialogOpen) {
              event.preventDefault();
            }
          }}
        >
          <div className="flex h-full flex-col overflow-hidden">
            <div className="border-b border-border px-6 py-4 sm:hidden">
              <p className={`break-words text-base font-semibold ${isRTL ? 'text-right' : 'text-center'}`}>
                {dialogTitle}
              </p>
            </div>
            <div className="hidden p-0 sm:block">
              <DialogHeader>
                <DialogTitle className="mb-4 flex flex-wrap items-center gap-2 break-words">
                  {dialogTitle}
                </DialogTitle>
              </DialogHeader>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 sm:p-0">
              {postLoading ? (
                <div className="flex flex-1 items-center justify-center py-24">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    <span>{postT('loading')}</span>
                  </div>
                </div>
              ) : isPostError || !selectedPost || !detailData ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border/80 p-10 text-center text-muted-foreground">
                  <p>{postT('detailLoadFailed')}</p>
                </div>
              ) : (
                <>
                  <PostDetailView
                    post={selectedPost}
                    t={postT}
                    isRTL={isRTL}
                    businessBadge={businessBadge}
                    cityDistrict={cityDistrict}
                    publishedDisplay={publishedDisplay}
                    hasDownloadableMedia={hasDownloadableMedia}
                    onRequestDownload={handleOpenDownloadDialog}
                    detailData={detailData}
                    onRequestContactInfo={handleFetchContactInfo}
                    contactInfo={contactInfo}
                    contactLoading={contactLoading}
                    mapWrapperClassName="lg:px-4"
                  />
                  <div className={cn('mt-6 flex', isRTL ? 'justify-start' : 'justify-end')}>
                    <Button asChild variant="link" className="h-auto p-0 text-sm">
                      <a
                        href={
                          selectedPost.permalink ?? `https://divar.ir/v/${selectedPost.externalId}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2"
                      >
                        {postT('openOnDivar')}
                        <ExternalLink className="size-4" aria-hidden />
                      </a>
                    </Button>
                  </div>
                </>
              )}
            </div>
            <div className="border-t border-border bg-background/95 px-6 py-4 sm:border-0 sm:bg-transparent sm:px-0">
              <div
                className={cn(
                  'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
                  isRTL ? 'sm:flex-row-reverse' : 'sm:flex-row',
                )}
              >
                <div className={cn('flex flex-wrap gap-3', isRTL ? 'flex-row-reverse' : 'flex-row')}>
                  <Button
                    type="button"
                    variant="secondary"
                    className="min-w-[140px] flex-1 sm:flex-none"
                    onClick={() => closeDialog(false)}
                  >
                    {postT('close')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <DownloadPhotosDialog
        open={downloadDialogOpen}
        onOpenChange={setDownloadDialogOpen}
        post={selectedPost ?? null}
        isRTL={isRTL}
        t={postT}
      />
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
  t: NotificationsTranslator;
  postT: ReturnType<typeof useTranslations<'dashboard.posts'>>;
  formatPrice: (value: number | string | null | undefined) => string | null;
  getRelativeLabel: (isoDate: string | null | undefined, jalaliFallback?: string | null) => string | null;
  dateFormatter: Intl.DateTimeFormat;
  onViewPost: (postId: string, notificationId: string, readAt: string | null) => void;
};

function NotificationCard({
  notification,
  t,
  postT,
  formatPrice,
  getRelativeLabel,
  dateFormatter,
  onViewPost,
}: NotificationCardProps) {
  const filterLabel = t('item.savedFilter', { name: notification.filter.name });

  const isRead = Boolean(notification.readAt);
  const statusLabel = isRead
    ? t('status.read')
    : t(`status.${notification.status.toLowerCase() as 'pending' | 'sent' | 'failed'}`);
  const statusBadgeClass = isRead
    ? 'bg-sky-600/90'
    : notification.status === 'SENT'
      ? 'bg-emerald-500/90'
      : notification.status === 'FAILED'
        ? 'bg-destructive/90'
        : 'bg-amber-500/90';

  const postSummary: DivarPostSummary = {
    id: notification.post.id,
    code: notification.post.code ?? 0,
    externalId: notification.post.id,
    title: notification.post.title,
    description: notification.post.description,
    ownerName: null,
    hasContactInfo: false,
    priceTotal: notification.post.priceTotal,
    rentAmount: notification.post.rentAmount,
    depositAmount: notification.post.depositAmount,
    dailyRateNormal: null,
    dailyRateWeekend: null,
    dailyRateHoliday: null,
    extraPersonFee: null,
    pricePerSquare: notification.post.pricePerSquare ?? null,
    area: notification.post.area ?? null,
    areaLabel: null,
    landArea: null,
    landAreaLabel: null,
    rooms: null,
    roomsLabel: null,
    floor: null,
    floorLabel: null,
    floorsCount: null,
    unitPerFloor: null,
    yearBuilt: null,
    yearBuiltLabel: null,
    capacity: null,
    capacityLabel: null,
    latitude: null,
    longitude: null,
    hasParking: null,
    hasElevator: null,
    hasWarehouse: null,
    hasBalcony: null,
    isRebuilt: null,
    photosVerified: notification.post.previewImageUrl ? true : null,
    cityName: notification.post.cityName,
    districtName: notification.post.districtName,
    provinceName: notification.post.provinceName,
    categorySlug: '',
    categoryName: null,
    categoryParentName: null,
    businessType: null,
    publishedAt: notification.post.publishedAt ?? notification.createdAt,
    publishedAtJalali: null,
    createdAt: notification.createdAt,
    permalink: notification.post.permalink,
    imageUrl: notification.post.previewImageUrl,
    mediaCount: notification.post.previewImageUrl ? 1 : 0,
    medias: [],
    attributes: null,
  };

  return (
    <PostCard
      post={postSummary}
      t={postT}
      formatPrice={formatPrice}
      getRelativeLabel={getRelativeLabel}
      dateFormatter={dateFormatter}
      onSelect={() =>
        onViewPost(notification.post.id, notification.id, notification.readAt)
      }
      showCategoryBreadcrumb={false}
      showPostCode
      headerBadges={
        <>
          <span
            className="inline-flex items-center rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-medium text-white"
            title={filterLabel}
          >
            <span className="max-w-[200px] truncate">{filterLabel}</span>
          </span>
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium text-white',
              statusBadgeClass,
            )}
          >
            {statusLabel}
          </span>
        </>
      }
    />
  );
}
