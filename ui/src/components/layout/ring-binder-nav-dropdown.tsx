'use client';

import { FolderKanban } from 'lucide-react';

import { Link } from '@/i18n/routing';
import type { RingBinderFolder } from '@/types/ring-binder';

type RingBinderNavDropdownProps = {
  label: string;
  manageLabel: string;
  folders: RingBinderFolder[];
  isLoading: boolean;
  isError: boolean;
  loadingLabel: string;
  emptyLabel: string;
  errorLabel: string;
};

export function RingBinderNavDropdown({
  label,
  manageLabel,
  folders,
  isLoading,
  isError,
  loadingLabel,
  emptyLabel,
  errorLabel,
}: RingBinderNavDropdownProps) {
  const hasFolders = folders.length > 0;
  const maxLabelLength = 15;
  const truncateLabel = (name: string) =>
    name.length > maxLabelLength ? `${name.slice(0, maxLabelLength)}...` : name;

  return (
    <div className="group relative">
      <Link
        href="/dashboard/ring-binder"
        className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-secondary/60 hover:text-secondary-foreground"
        aria-haspopup="menu"
      >
        <FolderKanban className="hidden size-4 shrink-0 text-muted-foreground lg:block" aria-hidden />
        {label}
      </Link>
      <div className="absolute start-0 top-full z-50 hidden w-max min-w-48 border border-border/70 bg-background p-2 shadow-lg group-focus-within:block group-hover:block">
        <div className="flex flex-col divide-y divide-border/70">
          <Link
            href="/dashboard/ring-binder"
            className="flex items-center gap-2 whitespace-nowrap px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary/60"
          >
            <FolderKanban className="hidden size-4 shrink-0 text-muted-foreground lg:block" aria-hidden />
            {manageLabel}
          </Link>
          {isLoading ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">{loadingLabel}</div>
          ) : isError ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">{errorLabel}</div>
          ) : hasFolders ? (
            folders.map((folder) => (
              <Link
                key={folder.id}
                href={`/dashboard?ringFolderId=${encodeURIComponent(folder.id)}`}
                className="flex items-center gap-2 whitespace-nowrap px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary/60"
                title={folder.name}
              >
                <FolderKanban className="hidden size-4 shrink-0 text-muted-foreground lg:block" aria-hidden />
                {truncateLabel(folder.name)}
              </Link>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">{emptyLabel}</div>
          )}
        </div>
      </div>
    </div>
  );
}
