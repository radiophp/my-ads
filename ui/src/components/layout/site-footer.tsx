'use client';
import { useTranslations } from 'next-intl';

export function Footer() {
  const t = useTranslations('footer');
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/60 bg-background/70 py-6 text-sm text-muted-foreground transition-colors">
      <div className="flex w-full flex-col items-center justify-between gap-3 px-4 sm:flex-row">
        <span>{t('copyright', { year })}</span>
      </div>
    </footer>
  );
}
