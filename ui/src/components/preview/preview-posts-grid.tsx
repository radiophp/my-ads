'use client';

import { useCallback, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import type { DivarPostSummary } from '@/types/divar-posts';
import { PostCard } from '@/components/dashboard/divar-posts/post-card';

type PreviewPostsGridProps = {
  posts: DivarPostSummary[];
  emptyLabel: string;
  onSelect?: (post: DivarPostSummary) => void;
};

export function PreviewPostsGrid({ posts, emptyLabel, onSelect }: PreviewPostsGridProps) {
  const t = useTranslations('dashboard.posts');
  const locale = useLocale();

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        maximumFractionDigits: 0,
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

  const relativeFormatter = useMemo(
    () =>
      new Intl.RelativeTimeFormat(locale, {
        numeric: 'auto',
      }),
    [locale],
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

  if (posts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 px-6 py-10 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          t={t}
          formatPrice={formatPrice}
          getRelativeLabel={getRelativeLabel}
          dateFormatter={dateFormatter}
          onSelect={onSelect}
          showCategoryBreadcrumb
          showPostCode={false}
        />
      ))}
    </div>
  );
}
