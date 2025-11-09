'use client';

import { DashboardSearchFilterPanel } from '@/components/dashboard/search-filter-panel';
import { DivarPostsFeed } from '@/components/dashboard/divar-posts-feed';

export function DashboardPlaceholder() {
  return (
    <main className="w-full px-4 py-12 sm:px-6">
      <section className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-3">
          <DashboardSearchFilterPanel />
        </div>
        <div className="lg:col-span-9">
          <DivarPostsFeed />
        </div>
      </section>
    </main>
  );
}
