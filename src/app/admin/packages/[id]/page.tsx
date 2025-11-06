import { unstable_setRequestLocale } from 'next-intl/server';

import { AdminPackageEditorClient } from '@/components/admin/admin-package-editor-client';
import { defaultLocale } from '@/i18n/config';

type AdminPackageEditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminPackageEditPage({
  params,
}: AdminPackageEditPageProps): Promise<JSX.Element> {
  unstable_setRequestLocale(defaultLocale);
  const { id } = await params;
  return <AdminPackageEditorClient mode="edit" packageId={id} />;
}
