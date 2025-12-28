'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Filter } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const MOBILE_QUERY = '(max-width: 1023px)';

type ModalEvent = CustomEvent<{ open: boolean }>;

export function MobileFilterFab() {
  const t = useTranslations('dashboard.filters');
  const locale = useLocale();
  const isRTL = useMemo(() => ['fa', 'ar', 'he'].includes(locale), [locale]);
  const [isMobile, setIsMobile] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const media = window.matchMedia(MOBILE_QUERY);
    const handleChange = () => setIsMobile(media.matches);
    handleChange();
    if (media.addEventListener) {
      media.addEventListener('change', handleChange);
      return () => media.removeEventListener('change', handleChange);
    }
    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const handleModal = (event: Event) => {
      const detail = (event as ModalEvent).detail;
      setModalOpen(Boolean(detail?.open));
    };
    window.addEventListener('dashboard:filter-modal', handleModal as EventListener);
    return () => window.removeEventListener('dashboard:filter-modal', handleModal as EventListener);
  }, []);

  if (!isMobile || modalOpen) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed bottom-[calc(4rem+1rem+env(safe-area-inset-bottom))] left-1/2 z-50 -translate-x-1/2 md:bottom-20">
      <div className="pointer-events-auto flex flex-col gap-3 md:flex-row">
        <Button
          type="button"
          variant="default"
          className={cn(
            'rounded-full px-4 py-2 ring-1 ring-white/25 backdrop-blur-2xl backdrop-saturate-200',
            'bg-primary/60 text-primary-foreground shadow-lg',
            'md:gap-4 md:px-14 md:py-7 md:text-xl',
          )}
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new Event('dashboard:open-filters'));
            }
          }}
        >
          <span className="flex items-center justify-center gap-2">
            {isRTL ? (
              <>
                <span>{t('title')}</span>
                <Filter className="size-4" />
              </>
            ) : (
              <>
                <Filter className="size-4" />
                <span>{t('title')}</span>
              </>
            )}
          </span>
        </Button>
      </div>
    </div>
  );
}
