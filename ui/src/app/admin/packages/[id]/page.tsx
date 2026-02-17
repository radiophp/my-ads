import { AdminPackageEditorClient } from '@/components/admin/admin-package-editor-client';

type AdminPackageEditPageProps = {
  params: { id: string };
};

export default function AdminPackageEditPage({ params }: AdminPackageEditPageProps) {
  return <AdminPackageEditorClient mode="edit" packageId={params.id} />;
}
