'use client';

import { useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  createInviteCodeDefaultValues,
  inviteCodeSchemaFactory,
  type InviteCodeFormValues,
} from '@/components/admin/invite-code-form-defs';
import { InviteCodeForm } from '@/components/admin/invite-code-form';
import { useToast } from '@/components/ui/use-toast';
import {
  useCreateInviteCodeMutation,
  useGetInviteCodeQuery,
  useGetUsersQuery,
  useUpdateInviteCodeMutation,
} from '@/features/api/apiSlice';
import { Link } from '@/i18n/routing';
import type { CurrentUser } from '@/types/auth';

type AdminInviteCodeEditorProps = {
  mode: 'create' | 'edit';
  inviteCodeId?: string;
};

const formatUserLabel = (user: CurrentUser) => {
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
  return name ? `${user.phone} - ${name}` : user.phone;
};

export function AdminInviteCodeEditor({ mode, inviteCodeId }: AdminInviteCodeEditorProps) {
  const t = useTranslations('admin.inviteCodes');
  const editorT = useTranslations('admin.inviteCodes.editor');
  const router = useRouter();
  const { toast } = useToast();

  const schema = useMemo(() => inviteCodeSchemaFactory(t), [t]);

  const form = useForm<InviteCodeFormValues>({
    resolver: zodResolver(schema),
    defaultValues: createInviteCodeDefaultValues,
    mode: 'onBlur',
  });

  const [createInviteCode, { isLoading: isCreating }] = useCreateInviteCodeMutation();
  const [updateInviteCode, { isLoading: isUpdating }] = useUpdateInviteCodeMutation();

  const { data: users = [] } = useGetUsersQuery();
  const userOptions = useMemo(
    () => users.map((user) => ({ id: user.id, label: formatUserLabel(user) })),
    [users],
  );

  const isEditing = mode === 'edit';

  const {
    data: existingCode,
    isLoading: isLoadingCode,
    isFetching: isFetchingCode,
  } = useGetInviteCodeQuery(inviteCodeId!, {
    skip: !isEditing || !inviteCodeId,
  });

  useEffect(() => {
    if (isEditing && existingCode) {
      form.reset({
        code: existingCode.code,
        inviterUserId: existingCode.inviterUserId,
        bonusDays: existingCode.bonusDays,
        monthlyInviteLimit: existingCode.monthlyInviteLimit,
        isActive: existingCode.isActive,
      });
    }
  }, [existingCode, form, isEditing]);

  const formTexts = useMemo(
    () => ({
      code: t('form.fields.code'),
      inviterUserId: t('form.fields.inviterUserId'),
      inviterPlaceholder: t('form.fields.inviterPlaceholder'),
      bonusDays: t('form.fields.bonusDays'),
      monthlyInviteLimit: t('form.fields.monthlyInviteLimit'),
      isActive: t('form.fields.isActive'),
      isActiveHint: t('form.fields.isActiveHint'),
      submit: isEditing ? t('form.updateSubmit') : t('form.createSubmit'),
      cancel: t('form.cancel'),
    }),
    [isEditing, t],
  );

  const headerTitle = isEditing ? editorT('updateTitle') : editorT('createTitle');
  const headerDescription = isEditing
    ? editorT('updateDescription')
    : editorT('createDescription');

  const isSubmitting = isCreating || isUpdating || form.formState.isSubmitting;
  const isLoadingData = isEditing && (isLoadingCode || isFetchingCode);

  const handleSubmit = async (values: InviteCodeFormValues) => {
    const payload = {
      code: values.code.trim(),
      inviterUserId: values.inviterUserId,
      bonusDays: values.bonusDays,
      monthlyInviteLimit: values.monthlyInviteLimit,
      isActive: values.isActive,
    };

    try {
      if (isEditing && inviteCodeId) {
        await updateInviteCode({ id: inviteCodeId, body: payload }).unwrap();
        toast({
          title: t('toast.updatedTitle'),
          description: t('toast.updatedDescription'),
        });
      } else {
        await createInviteCode(payload).unwrap();
        toast({
          title: t('toast.createdTitle'),
          description: t('toast.createdDescription'),
        });
      }
      router.push('/admin/invite-codes');
    } catch (error) {
      console.error('Failed to submit invite code', error);
      toast({
        title: t('toast.errorTitle'),
        description: t('toast.errorDescription'),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex w-full flex-col gap-6 px-4 py-8">
      <div className="flex items-center gap-2">
        <Button variant="ghost" asChild>
          <Link href="/admin/invite-codes">
            <ArrowLeft className="mr-2 size-4" aria-hidden />
            {editorT('backToList')}
          </Link>
        </Button>
      </div>
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>{headerTitle}</CardTitle>
          <CardDescription>{headerDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingData ? (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" aria-hidden />
              <span>{editorT('loading')}</span>
            </div>
          ) : (
            <InviteCodeForm
              form={form}
              onSubmit={handleSubmit}
              texts={formTexts}
              isSubmitting={isSubmitting}
              submitIcon={<Save className="mr-2 size-4" aria-hidden />}
              secondaryAction={
                isEditing ? null : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => form.reset(createInviteCodeDefaultValues)}
                    disabled={isSubmitting}
                  >
                    {editorT('reset')}
                  </Button>
                )
              }
              users={userOptions}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
