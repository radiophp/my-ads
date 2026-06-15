'use client';

export function PostCardSkeleton() {
  return (
    <article className="bg-card flex size-full min-h-[360px] min-w-0 animate-pulse flex-col gap-3 overflow-hidden rounded-xl border border-border/70 p-4 shadow-sm">
      <div className="-mx-4 -mt-4 overflow-hidden rounded-t-xl">
        <div className="relative h-48 w-full bg-muted/60" />
        <div className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-wrap gap-2 text-xs">
          <span className="inline-flex h-6 w-20 rounded-full bg-black/30" />
          <span className="inline-flex h-6 w-24 rounded-full bg-black/30" />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 pt-1">
        <div className="h-4 w-3/4 rounded bg-muted/60" />
        <div className="h-4 w-24 rounded bg-muted/50" />
        <div className="flex flex-col gap-2 text-sm">
          <div className="h-3 w-2/3 rounded bg-muted/50" />
          <div className="h-3 w-1/2 rounded bg-muted/50" />
          <div className="h-3 w-1/3 rounded bg-muted/50" />
          <div className="h-3 w-1/4 rounded bg-muted/50" />
        </div>
      </div>
    </article>
  );
}
