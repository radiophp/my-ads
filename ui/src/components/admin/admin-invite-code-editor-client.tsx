'use client';

import { AdminGuard } from '@/components/auth/admin-guard';
import { AdminInviteCodeEditor } from '@/components/admin/admin-invite-code-editor';

type AdminInviteCodeEditorClientProps = {
  mode: 'create' | 'edit';
  inviteCodeId?: string;
};

export function AdminInviteCodeEditorClient({
  mode,
  inviteCodeId,
}: AdminInviteCodeEditorClientProps) {
  return (
    <AdminGuard>
      <AdminInviteCodeEditor mode={mode} inviteCodeId={inviteCodeId} />
    </AdminGuard>
  );
}
