import { AdminFeaturedPostForm } from '@/components/admin/admin-featured-post-form';

type AdminFeaturedPostEditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminFeaturedPostEditPage({
  params,
}: AdminFeaturedPostEditPageProps) {
  const { id } = await params;
  return <AdminFeaturedPostForm mode="edit" itemId={id} />;
}
