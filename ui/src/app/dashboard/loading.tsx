export default function DashboardLoading() {
  return (
    <div className="container mx-auto p-4">
      <div className="mb-4 h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="bg-card h-64 animate-pulse rounded-lg border p-4"
          >
            <div className="mb-3 h-32 rounded-md bg-muted" />
            <div className="mb-2 h-4 w-3/4 rounded bg-muted" />
            <div className="h-4 w-1/2 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
