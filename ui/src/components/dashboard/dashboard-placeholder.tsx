'use client';

import { DashboardSearchFilterPanel } from '@/components/dashboard/search-filter-panel';
import { DivarPostsFeed } from '@/components/dashboard/divar-posts-feed';

export function DashboardPlaceholder() {
  return (
    <div className="flex min-h-screen flex-col bg-background lg:h-screen lg:overflow-hidden">
      <section className="flex h-full min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:overflow-hidden lg:px-8">
        <div className="grid size-full min-h-0 grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="w-full lg:col-span-3 lg:flex lg:h-full lg:min-h-0">
            <DashboardSearchFilterPanel />
          </div>
          <div className="w-full lg:col-span-9 lg:flex lg:h-full lg:min-h-0">
            <DivarPostsFeed />
          </div>
        </div>
      </section>
    </div>
  );
}
