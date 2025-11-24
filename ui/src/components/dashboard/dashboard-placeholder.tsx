'use client';

import { DashboardSearchFilterPanel } from '@/components/dashboard/search-filter-panel';
import { DivarPostsFeed } from '@/components/dashboard/divar-posts-feed';

export function DashboardPlaceholder() {
  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <section className="flex h-full min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 lg:overflow-hidden">
        <div className="grid h-full min-h-0 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-3 lg:flex lg:h-full lg:min-h-0">
            <DashboardSearchFilterPanel />
          </div>
          <div className="lg:col-span-9 lg:flex lg:h-full lg:min-h-0">
            <DivarPostsFeed />
          </div>
        </div>
      </section>
    </div>
  );
}
