import { Suspense } from 'react';

import { SavedFiltersClient } from '@/components/dashboard/saved-filters-client';

export default function SavedFiltersPage() {
  return (
    <Suspense fallback={null}>
      <SavedFiltersClient />
    </Suspense>
  );
}
