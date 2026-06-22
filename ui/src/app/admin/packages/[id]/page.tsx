import { AdminPackageEditorClient } from '@/components/admin/admin-package-editor-client';

type AdminPackageEditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminPackageEditPage({ params }: AdminPackageEditPageProps) {
  const { id } = await params;
  return <AdminPackageEditorClient mode="edit" packageId={id} />;
}
