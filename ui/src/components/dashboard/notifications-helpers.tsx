import type { JSX } from 'react';
import { Bell } from 'lucide-react';

export function NotificationsSkeleton(): JSX.Element {
  const skeletonKeys = ['one', 'two', 'three'];
  return (
    <div className="space-y-4">
      {skeletonKeys.map((key) => (
        <div key={key} className="bg-card/50 animate-pulse rounded-2xl border border-border/70 p-4">
          <div className="h-5 w-1/3 rounded bg-muted" />
          <div className="mt-2 h-4 w-1/4 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps): JSX.Element {
  return (
    <div className="rounded-2xl border border-dashed border-border/70 bg-muted/30 px-6 py-10 text-center">
      <Bell className="mx-auto mb-3 size-8 text-muted-foreground" aria-hidden />
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
