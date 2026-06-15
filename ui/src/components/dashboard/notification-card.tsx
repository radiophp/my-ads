'use client';

import type { JSX } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { PostCard } from '@/components/dashboard/divar-posts/post-card';
import type { DivarPostSummary } from '@/types/divar-posts';
import type { NotificationsState } from '@/features/notifications/notificationsSlice';

type NotificationsTranslator = ReturnType<typeof useTranslations<'dashboard.notificationsPage'>>;

type NotificationCardProps = {
  notification: NotificationsState['items'][number];
  t: NotificationsTranslator;
  postT: ReturnType<typeof useTranslations<'dashboard.posts'>>;
  formatPrice: (value: number | string | null | undefined) => string | null;
  getRelativeLabel: (isoDate: string | null | undefined, jalaliFallback?: string | null) => string | null;
  dateFormatter: Intl.DateTimeFormat;
  onViewPost: (postId: string, notificationId: string, readAt: string | null) => void;
};

export function NotificationCard({
  notification,
  t,
  postT,
  formatPrice,
  getRelativeLabel,
  dateFormatter,
  onViewPost,
}: NotificationCardProps): JSX.Element {
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
