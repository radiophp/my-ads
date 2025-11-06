import { unstable_setRequestLocale } from 'next-intl/server';

import { AdminPackageEditorClient } from '@/components/admin/admin-package-editor-client';
import { defaultLocale } from '@/i18n/config';

export default function AdminPackagesNewPage() {
  unstable_setRequestLocale(defaultLocale);
  return <AdminPackageEditorClient mode="create" />;
}
