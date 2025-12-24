import { AdminSlideForm } from '@/components/admin/admin-slide-form';

type AdminSlideEditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminSlideEditPage({ params }: AdminSlideEditPageProps) {
  const { id } = await params;
  return <AdminSlideForm mode="edit" slideId={id} />;
}
