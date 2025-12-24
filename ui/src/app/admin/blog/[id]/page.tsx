import { AdminBlogForm } from '@/components/admin/admin-blog-form';

export default async function AdminBlogEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminBlogForm mode="edit" blogId={id} />;
}
