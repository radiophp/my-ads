'use client';

import { AdminGuard } from '@/components/auth/admin-guard';
import { AdminPostsToAnalyzeManager } from '@/components/admin/admin-posts-to-analyze-manager';

export function AdminPostsToAnalyzeClient() {
  return (
    <AdminGuard>
      <AdminPostsToAnalyzeManager />
    </AdminGuard>
  );
}
