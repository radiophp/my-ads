import { LoadingLogo } from '@/components/ui/loading-logo';

export default function AdminLoading() {
  return (
    <div className="container mx-auto flex flex-col items-center gap-6 p-4">
      <LoadingLogo size="lg" />
      <div className="w-full">
        <div className="mb-4 h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="bg-card h-64 animate-pulse rounded-lg border p-4">
          <div className="mb-4 h-6 w-32 rounded bg-muted" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 w-full rounded bg-muted" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
