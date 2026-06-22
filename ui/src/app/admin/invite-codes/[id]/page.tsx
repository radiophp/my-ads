import { AdminInviteCodeEditorClient } from '@/components/admin/admin-invite-code-editor-client';

type AdminInviteCodeEditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminInviteCodeEditPage({ params }: AdminInviteCodeEditPageProps) {
  const { id } = await params;
  return <AdminInviteCodeEditorClient mode="edit" inviteCodeId={id} />;
}
