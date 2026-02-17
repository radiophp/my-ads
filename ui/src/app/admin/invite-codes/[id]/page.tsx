import { AdminInviteCodeEditorClient } from '@/components/admin/admin-invite-code-editor-client';

type AdminInviteCodeEditPageProps = {
  params: { id: string };
};

export default function AdminInviteCodeEditPage({ params }: AdminInviteCodeEditPageProps) {
  return <AdminInviteCodeEditorClient mode="edit" inviteCodeId={params.id} />;
}
