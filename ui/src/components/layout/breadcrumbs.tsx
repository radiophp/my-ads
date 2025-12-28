'use client';

import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';

import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function formatSegment(segment: string) {
  return segment
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function Breadcrumbs() {
  const pathname = usePathname() ?? '';
  const locale = useLocale();
  const isRTL = locale === 'fa';
  const navT = useTranslations('header.nav');
  const adminT = useTranslations('admin.dashboard.cards');
  const profileT = useTranslations('profile');
  const breadcrumbT = useTranslations('breadcrumbs');

  if (pathname === '/' || pathname === '') {
    return null;
  }

  const cleanPath = pathname.split('?')[0]?.split('#')[0] ?? pathname;
  const segments = cleanPath.split('/').filter(Boolean);

  const baseLabels: Record<string, string> = {
    dashboard: navT('dashboard'),
    notifications: navT('notifications'),
    'saved-filters': navT('savedFilters'),
    'ring-binder': navT('ringBinder'),
    admin: navT('admin'),
    news: navT('news'),
    blog: navT('blog'),
    about: navT('about'),
    login: navT('login'),
    profile: profileT('title'),
    posts: breadcrumbT('posts'),
    preview: breadcrumbT('preview'),
    offline: breadcrumbT('offline'),
  };

  const adminLabels: Record<string, string> = {
    packages: adminT('packages.title'),
    provinces: adminT('provinces.title'),
    cities: adminT('cities.title'),
    districts: adminT('districts.title'),
    'divar-categories': adminT('divarCategories.title'),
    'divar-filters': adminT('divarFilters.title'),
    'divar-reports': adminT('divarReports.title'),
    'divar-posts': adminT('postsToAnalyze.title'),
    'divar-sessions': adminT('divarSessions.title'),
    'arka-sessions': adminT('arkaSessions.title'),
    news: adminT('news.title'),
    blog: adminT('blog.title'),
    slides: adminT('slides.title'),
    'featured-posts': adminT('featuredPosts.title'),
    seo: adminT('seoSettings.title'),
    'website-settings': adminT('websiteSettings.title'),
    notifications: adminT('notifications.title'),
  };

  const resolveLabel = (segment: string, parent?: string) => {
    if (UUID_REGEX.test(segment) || /^\d+$/.test(segment)) {
      return breadcrumbT('details');
    }

    if (segment === 'new') {
      return breadcrumbT('new');
    }

    if (parent === 'news' && segment === 'categories') {
      return adminT('newsCategories.title');
    }
    if (parent === 'news' && segment === 'tags') {
      return adminT('newsTags.title');
    }
    if (parent === 'news' && segment === 'sources') {
      return adminT('newsSources.title');
    }
    if (parent === 'blog' && segment === 'categories') {
      return adminT('blogCategories.title');
    }
    if (parent === 'blog' && segment === 'tags') {
      return adminT('blogTags.title');
    }
    if (parent === 'blog' && segment === 'sources') {
      return adminT('blogSources.title');
    }

    if (parent === 'admin' && adminLabels[segment]) {
      return adminLabels[segment];
    }

    if (baseLabels[segment]) {
      return baseLabels[segment];
    }

    return formatSegment(decodeURIComponent(segment));
  };

  const crumbs = segments.map((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join('/')}`;
    const label = resolveLabel(segment, segments[index - 1]);
    return { href, label };
  });

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        'mx-auto w-full max-w-6xl px-4 pt-4 text-sm text-muted-foreground sm:pt-6',
        isRTL ? 'text-right' : 'text-left',
      )}
    >
      <ol
        className={cn(
          'flex w-full flex-wrap items-center gap-2',
          isRTL ? 'justify-start text-right' : 'justify-start text-left',
        )}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <li className="flex items-center gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-background/70 px-2 py-1 text-xs font-medium text-foreground transition hover:bg-accent"
            aria-label={navT('home')}
          >
            <Image
              src="/fav/android-chrome-192x192.png"
              alt=""
              width={16}
              height={16}
              className="size-4"
              priority={false}
            />
            <span className="sr-only">{navT('home')}</span>
          </Link>
        </li>
        {crumbs.map((crumb, index) => (
          <li key={crumb.href} className="flex items-center gap-2">
            <span className="text-muted-foreground">{isRTL ? '›' : '‹'}</span>
            {index === crumbs.length - 1 ? (
              <span className="font-semibold text-foreground">{crumb.label}</span>
            ) : (
              <Link
                href={crumb.href}
                className="text-foreground/80 transition hover:text-foreground"
              >
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
