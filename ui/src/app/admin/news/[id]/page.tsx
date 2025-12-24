import { AdminNewsForm } from '@/components/admin/admin-news-form';

type AdminNewsEditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminNewsEditPage({ params }: AdminNewsEditPageProps) {
  const { id } = await params;
  return <AdminNewsForm mode="edit" newsId={id} />;
}
