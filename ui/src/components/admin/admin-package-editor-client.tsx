'use client';

import { AdminGuard } from '@/components/auth/admin-guard';
import { AdminPackageEditor } from '@/components/admin/admin-package-editor';

type AdminPackageEditorClientProps = {
  mode: 'create' | 'edit';
  packageId?: string;
};

export function AdminPackageEditorClient({
  mode,
  packageId,
}: AdminPackageEditorClientProps) {
  return (
    <AdminGuard>
      <AdminPackageEditor mode={mode} packageId={packageId} />
    </AdminGuard>
  );
}
