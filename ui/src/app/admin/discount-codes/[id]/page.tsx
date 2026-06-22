import { AdminDiscountCodeEditorClient } from '@/components/admin/admin-discount-code-editor-client';

type AdminDiscountCodeEditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminDiscountCodeEditPage({ params }: AdminDiscountCodeEditPageProps) {
  const { id } = await params;
  return <AdminDiscountCodeEditorClient mode="edit" discountCodeId={id} />;
}
