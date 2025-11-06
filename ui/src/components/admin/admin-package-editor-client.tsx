'use client';

import type { JSX } from 'react';

import { AdminGuard } from '@/components/auth/admin-guard';
import { AdminPackageEditor } from '@/components/admin/admin-package-editor';

type AdminPackageEditorClientProps = {
  mode: 'create' | 'edit';
  packageId?: string;
};

export function AdminPackageEditorClient({
  mode,
  packageId,
}: AdminPackageEditorClientProps): JSX.Element {
  return (
    <AdminGuard>
      <AdminPackageEditor mode={mode} packageId={packageId} />
    </AdminGuard>
  );
}
