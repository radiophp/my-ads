'use client';

import { DashboardSearchFilterPanel } from '@/components/dashboard/search-filter-panel';
import { DivarPostsFeed } from '@/components/dashboard/divar-posts-feed';

export function DashboardPlaceholder() {
  return (
    <div className="flex min-h-screen flex-col bg-background lg:h-screen lg:overflow-hidden">
      <section className="flex h-full min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 lg:overflow-hidden lg:overflow-y-hidden">
        <div className="grid h-full min-h-0 w-full grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-3 lg:flex lg:h-full lg:min-h-0 w-full">
            <DashboardSearchFilterPanel />
          </div>
          <div className="lg:col-span-9 lg:flex lg:h-full lg:min-h-0 w-full">
            <DivarPostsFeed />
          </div>
        </div>
      </section>
    </div>
  );
}
