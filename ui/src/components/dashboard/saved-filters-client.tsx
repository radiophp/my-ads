'use client';

import { AuthGuard } from '@/components/auth/auth-guard';
import { SavedFiltersPanel } from '@/components/dashboard/saved-filters-panel';

export function SavedFiltersClient() {
  return (
    <AuthGuard>
      <SavedFiltersPanel />
    </AuthGuard>
  );
}
