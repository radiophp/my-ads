'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

import { DashboardSearchFilterPanel } from '@/components/dashboard/search-filter-panel';
import { DivarPostsFeed } from '@/components/dashboard/divar-posts-feed';
import { useAppDispatch } from '@/lib/hooks';
import { setRingBinderFolder } from '@/features/search-filter/searchFilterSlice';

export function DashboardPlaceholder() {
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();

  useEffect(() => {
    const ringFolderParam =
      searchParams.get('ringFolderId') ?? searchParams.get('ringBinderFolderId');
    if (ringFolderParam) {
      dispatch(setRingBinderFolder(ringFolderParam));
    }
  }, [dispatch, searchParams]);

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
