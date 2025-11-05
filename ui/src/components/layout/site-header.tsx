'use client';

import type { JSX } from 'react';
import { useTranslations } from 'next-intl';

import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { LocaleSwitcher } from '@/components/layout/locale-switcher';
import { Link, usePathname } from '@/i18n/routing';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', labelKey: 'header.nav.dashboard' },
  { href: '/guides', labelKey: 'header.nav.guides' },
] as const;

export function SiteHeader(): JSX.Element {
  const pathname = usePathname();
  const t = useTranslations();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur transition-colors">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-lg font-semibold">
            {t('header.brand')}
          </Link>
          <nav className="hidden items-center gap-2 text-sm sm:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'rounded-md px-3 py-2 transition-colors hover:bg-secondary/60 hover:text-secondary-foreground',
                  pathname === item.href && 'bg-secondary/70 text-secondary-foreground',
                )}
              >
                {t(item.labelKey)}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          <Button variant="outline" asChild>
            <Link href="/docs/getting-started">{t('header.docs')}</Link>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
