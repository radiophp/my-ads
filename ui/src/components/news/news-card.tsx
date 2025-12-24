import Image from 'next/image';

import type { NewsItem } from '@/types/news';
import { Link } from '@/i18n/routing';
import { normalizeStorageUrl } from '@/lib/storage';

type NewsCardProps = {
  item: NewsItem;
  locale: string;
  appBase?: string | null;
  sizes?: string;
  imageHeightClass?: string;
};

const formatNewsDate = (locale: string, value: string) =>
  new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value));

export function NewsCard({
  item,
  locale,
  appBase,
  sizes = '(max-width: 1024px) 100vw, 33vw',
  imageHeightClass = 'h-40',
}: NewsCardProps) {
  const imageUrl = normalizeStorageUrl(item.mainImageUrl, appBase ?? undefined);
  const dateLabel = formatNewsDate(locale, item.createdAt);

  return (
    <article className="bg-card flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 shadow-sm transition hover:border-primary/60">
      <Link href={`/news/${item.slug}`} className="flex h-full flex-col">
        <div className={`relative w-full bg-muted/40 ${imageHeightClass}`}>
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={item.title}
              fill
              sizes={sizes}
              className="absolute inset-0 size-full object-cover"
            />
          ) : null}
          <span className="pointer-events-none absolute bottom-3 left-3 inline-flex items-center rounded-full bg-black/70 px-2 py-0.5 text-xs text-white">
            {dateLabel}
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-3 p-4">
          <h3 className="line-clamp-2 text-sm font-medium leading-6 text-foreground">
            {item.title}
          </h3>
        </div>
      </Link>
    </article>
  );
}
