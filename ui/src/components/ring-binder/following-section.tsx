'use client';

import { useTranslations } from 'next-intl';
import { ExternalLink, Users } from 'lucide-react';

import { LoadingLogo } from '@/components/ui/loading-logo';
import { Link } from '@/i18n/routing';
import { useGetSharedWithMeQuery } from '@/features/api/endpoints/ring-binder';

export function FollowingSection() {
  const t = useTranslations('ringBinder');
  const { data: sharedFolders = [], isLoading, isError } = useGetSharedWithMeQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingLogo />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {t('share.loadError') || t('sharedWithMe.empty')}
      </div>
    );
  }

  if (sharedFolders.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        {t('sharedWithMe.empty')}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Users className="size-4" />
        {t('sharedWithMe.followingTitle')}
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {sharedFolders.map((folder) => (
          <Link
            key={folder.id}
            href={`/dashboard?ringFolderId=${folder.folderId}&shared=1`}
            className="flex items-start justify-between gap-2 rounded-2xl border border-border/70 p-4 transition-colors hover:border-border hover:bg-accent/30"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {folder.folderName}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {folder.ownerPhone}
              </p>
            </div>
            <span
              className="flex size-7 shrink-0 items-center justify-center rounded-lg border text-muted-foreground transition-colors group-hover:border-muted-foreground/30"
              aria-hidden="true"
            >
              <ExternalLink className="size-4" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
