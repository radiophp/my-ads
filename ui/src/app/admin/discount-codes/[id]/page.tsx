import { AdminDiscountCodeEditorClient } from '@/components/admin/admin-discount-code-editor-client';

type AdminDiscountCodeEditPageProps = {
  params: { id: string };
};

export default function AdminDiscountCodeEditPage({ params }: AdminDiscountCodeEditPageProps) {
  return <AdminDiscountCodeEditorClient mode="edit" discountCodeId={params.id} />;
}
