'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import type { DivarPostSummary } from '@/types/divar-posts';
import { PreviewPostsGrid } from '@/components/preview/preview-posts-grid';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/routing';

type PreviewPostsSectionProps = {
  posts: DivarPostSummary[];
  emptyLabel: string;
};

export function PreviewPostsSection({ posts, emptyLabel }: PreviewPostsSectionProps) {
  const t = useTranslations('preview');
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  return (
    <>
      <PreviewPostsGrid
        posts={posts}
        emptyLabel={emptyLabel}
        onSelect={() => setShowLoginPrompt(true)}
      />
      <Dialog open={showLoginPrompt} onOpenChange={setShowLoginPrompt}>
        <DialogContent className="max-w-md text-right">
          <DialogHeader>
            <DialogTitle>{t('loginTitle')}</DialogTitle>
            <DialogDescription>{t('loginDescription')}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setShowLoginPrompt(false)}>
              {t('loginClose')}
            </Button>
            <Button asChild>
              <Link href="/">{t('loginAction')}</Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
