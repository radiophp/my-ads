import { useLocale, useTranslations } from 'next-intl';
import { ExternalLink } from 'lucide-react';

import { Link } from '@/i18n/routing';
import type { RingBinderFolder } from '@/types/ring-binder';

type RingBinderFolderCardProps = {
  folder: RingBinderFolder;
};

export function RingBinderFolderCard({ folder }: RingBinderFolderCardProps) {
  const t = useTranslations('dashboard.posts');
  const locale = useLocale();
  const href = `/dashboard?ringFolderId=${folder.id}`;

  return (
    <Link
      href={href}
      className="flex items-start justify-between gap-2 rounded-2xl border border-border/70 p-4 transition-colors hover:border-border hover:bg-accent/30"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-foreground">{folder.name}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {t('savedCount', { count: (folder.savedPostCount ?? 0).toLocaleString(locale) })}
        </p>
      </div>
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border text-muted-foreground transition-colors group-hover:border-muted-foreground/30" aria-hidden>
        <ExternalLink className="size-4" />
      </span>
    </Link>
  );
}
