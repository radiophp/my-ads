'use client';

import { AdminGuard } from '@/components/auth/admin-guard';
import { AdminDiscountCodeEditor } from '@/components/admin/admin-discount-code-editor';

type AdminDiscountCodeEditorClientProps = {
  mode: 'create' | 'edit';
  discountCodeId?: string;
};

export function AdminDiscountCodeEditorClient({
  mode,
  discountCodeId,
}: AdminDiscountCodeEditorClientProps) {
  return (
    <AdminGuard>
      <AdminDiscountCodeEditor mode={mode} discountCodeId={discountCodeId} />
    </AdminGuard>
  );
}
