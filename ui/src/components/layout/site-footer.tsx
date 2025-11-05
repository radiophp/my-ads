'use client';

import type { JSX } from 'react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/routing';

export function Footer(): JSX.Element {
  const t = useTranslations('footer');
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/60 bg-background/70 py-6 text-sm text-muted-foreground transition-colors">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-2 px-4 sm:flex-row">
        <span>{t('copyright', { year })}</span>
        <div className="flex items-center gap-3">
          <Link href="/privacy" className="hover:text-primary">
            {t('privacy')}
          </Link>
          <Link href="/terms" className="hover:text-primary">
            {t('terms')}
          </Link>
        </div>
      </div>
    </footer>
  );
}
