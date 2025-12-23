'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  BedDouble,
  Building,
  Building2,
  Factory,
  Home,
  Landmark,
  LucideIcon,
  Map,
  ShoppingBag,
  Store,
  TreePalm,
} from 'lucide-react';

import { useGetDivarPostCategoryCountsQuery } from '@/features/api/apiSlice';

const iconFallback: LucideIcon = ShoppingBag;
const ICONS_BY_SLUG: Record<string, LucideIcon> = {
  'apartment-sell': Building,
  'apartment-rent': Building,
  'house-villa-sell': Home,
  'house-villa-rent': Home,
  'plot-old': Map,
  'shop-rent': Store,
  'shop-sell': Store,
  'office-rent': Building2,
  'office-sell': Building2,
  villa: TreePalm,
  'industry-agriculture-business-rent': Factory,
  'industry-agriculture-business-sell': Factory,
  'suite-apartment': BedDouble,
  presell: Landmark,
};
const ICON_STYLES_BY_SLUG: Record<string, { bg: string; text: string }> = {
  'apartment-sell': { bg: 'bg-sky-500/5', text: 'text-sky-500' },
  'apartment-rent': { bg: 'bg-sky-500/5', text: 'text-sky-500' },
  'house-villa-sell': { bg: 'bg-emerald-500/5', text: 'text-emerald-500' },
  'house-villa-rent': { bg: 'bg-emerald-500/5', text: 'text-emerald-500' },
  'plot-old': { bg: 'bg-amber-500/5', text: 'text-amber-500' },
  'shop-rent': { bg: 'bg-orange-500/5', text: 'text-orange-500' },
  'shop-sell': { bg: 'bg-orange-500/5', text: 'text-orange-500' },
  'office-rent': { bg: 'bg-indigo-500/5', text: 'text-indigo-500' },
  'office-sell': { bg: 'bg-indigo-500/5', text: 'text-indigo-500' },
  villa: { bg: 'bg-lime-500/5', text: 'text-lime-500' },
  'industry-agriculture-business-rent': { bg: 'bg-slate-500/5', text: 'text-slate-500' },
  'industry-agriculture-business-sell': { bg: 'bg-slate-500/5', text: 'text-slate-500' },
  'suite-apartment': { bg: 'bg-teal-500/5', text: 'text-teal-500' },
  presell: { bg: 'bg-rose-500/5', text: 'text-rose-500' },
};

const resolveIcon = (slug: string): LucideIcon => {
  return ICONS_BY_SLUG[slug] ?? iconFallback;
};

const resolveIconStyles = (slug: string): { bg: string; text: string } => {
  return ICON_STYLES_BY_SLUG[slug] ?? { bg: 'bg-muted/30', text: 'text-muted-foreground' };
};

const formatCount = (value: number, locale: string): string => {
  try {
    return new Intl.NumberFormat(locale).format(value);
  } catch {
    return value.toString();
  }
};

const formatBreadcrumbParts = (
  displayPath: string,
  fallback: string,
): { parent: string; leaf: string } => {
  if (!displayPath) return { parent: '', leaf: fallback };
  const parts = displayPath
    .split(' - ')
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !part.includes('دسته بندی اصلی') && !part.toLowerCase().includes('main'));

  if (parts.length === 0) return { parent: '', leaf: fallback };
  if (parts.length === 1) return { parent: '', leaf: parts[0] ?? fallback };
  const parent = parts.at(-2);
  const leaf = parts.at(-1);
  if (!parent || !leaf) return { parent: '', leaf: fallback };
  return { parent, leaf };
};

export function HomeCategoryKpis() {
  const t = useTranslations('landing.kpi');
  const locale = useLocale();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);
  const {
    data: counts,
    isLoading,
    isError,
  } = useGetDivarPostCategoryCountsQuery();
  const [animated, setAnimated] = useState<
    Record<string, { personal: number; business: number }>
  >({});
  const hasAnimated = useRef(false);

  const normalizedCounts = useMemo(() => counts ?? [], [counts]);

  useEffect(() => {
    const target = containerRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
          }
        });
      },
      { threshold: 0.2 },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || hasAnimated.current || normalizedCounts.length === 0) {
      return;
    }

    hasAnimated.current = true;
    const start = performance.now();
    const duration = 1200;

    const targetCounts = normalizedCounts.reduce<
      Record<string, { personal: number; business: number }>
    >((acc, item) => {
      acc[item.slug] = {
        personal: Math.max(item.personalCount, 0),
        business: Math.max(item.businessCount, 0),
      };
      return acc;
    }, {});

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const next: Record<string, { personal: number; business: number }> = {};

      for (const [slug, target] of Object.entries(targetCounts)) {
        next[slug] = {
          personal: Math.floor(target.personal * progress),
          business: Math.floor(target.business * progress),
        };
      }

      setAnimated(next);
      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    };

    requestAnimationFrame(tick);
  }, [inView, normalizedCounts]);

  const cards = useMemo(() => {
    return normalizedCounts.map((item) => {
      const Icon = resolveIcon(item.slug);
      const iconStyles = resolveIconStyles(item.slug);
      const value = animated[item.slug];
      const personalValue = value?.personal ?? (hasAnimated.current ? item.personalCount : 0);
      const businessValue = value?.business ?? (hasAnimated.current ? item.businessCount : 0);
      const { parent, leaf } = formatBreadcrumbParts(item.displayPath, item.name);
      return (
        <div
          key={item.slug}
          className="bg-card/70 overflow-hidden rounded-2xl border border-border/70 shadow-sm transition-colors"
        >
          <div className="flex h-full items-stretch">
            <span
              className={`flex w-14 items-center justify-center ${iconStyles.bg} ${iconStyles.text}`}
            >
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <div className="flex flex-1 flex-col gap-2 px-5 py-4">
              <div className="min-h-[2.5rem] space-y-1 font-normal">
                <span className="block text-sm text-foreground">{parent || ' '}</span>
                <span className="block text-sm text-muted-foreground">{leaf}</span>
              </div>
              <div className="flex flex-wrap items-baseline gap-4 text-sm text-foreground">
                <span className="inline-flex items-baseline gap-1">
                <span className="text-xs text-muted-foreground">{t('labels.personal')}</span>
                <span className="text-xs font-light text-muted-foreground">
                  {formatCount(personalValue, locale)}
                </span>
              </span>
              <span className="inline-flex items-baseline gap-1">
                <span className="text-xs text-muted-foreground">{t('labels.business')}</span>
                <span className="text-xs font-light text-muted-foreground">
                  {formatCount(businessValue, locale)}
                </span>
              </span>
              </div>
            </div>
          </div>
        </div>
      );
    });
  }, [animated, locale, normalizedCounts]);

  return (
    <section ref={containerRef} className="w-full space-y-8 pb-20">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 text-center">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t('eyebrow')}
        </span>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {t('title')}
        </h2>
        <p className="text-sm text-muted-foreground sm:text-base">{t('subtitle')}</p>
      </div>

      {isError ? (
        <div className="mx-auto max-w-2xl rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-5 text-center text-sm text-destructive">
          {t('error')}
        </div>
      ) : isLoading ? (
        <div className="mx-auto grid w-full max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={`kpi-skeleton-${index}`}
              className="h-20 animate-pulse rounded-2xl border border-border/50 bg-muted/40"
            />
          ))}
        </div>
      ) : (
        <div className="mx-auto grid w-full max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards}
        </div>
      )}
    </section>
  );
}
