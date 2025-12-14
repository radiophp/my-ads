'use client';

import { useMemo, useState } from 'react';
import { Loader2, Lock, LockOpen, Plus, RefreshCw, ShieldCheck, Unlock, Edit3 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  useCreateAdminDivarSessionMutation,
  useGetAdminDivarSessionsQuery,
  useUpdateAdminDivarSessionMutation,
} from '@/features/api/apiSlice';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import type { AdminDivarSession } from '@/types/admin-divar-session';

type SessionFormState = {
  phone: string;
  jwt: string;
  active: boolean;
  locked: boolean;
};

export function AdminDivarSessionsManager() {
  const t = useTranslations('admin.divarSessions');
  const { toast } = useToast();
  const { data: sessions = [], isLoading, isFetching, refetch } = useGetAdminDivarSessionsQuery();
  const [createSession, { isLoading: isCreating }] = useCreateAdminDivarSessionMutation();
  const [updateSession, { isLoading: isUpdating }] = useUpdateAdminDivarSessionMutation();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editSession, setEditSession] = useState<AdminDivarSession | null>(null);
  const [form, setForm] = useState<SessionFormState>({
    phone: '',
    jwt: '',
    active: true,
    locked: false,
  });

  const busy = isLoading || isFetching;

  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)),
    [sessions],
  );

  const resetForm = () =>
    setForm({
      phone: '',
      jwt: '',
      active: true,
      locked: false,
    });

  const openCreateDialog = () => {
    resetForm();
    setAddDialogOpen(true);
  };

  const submitCreate = async () => {
    if (!form.phone || !form.jwt) {
      toast({
        title: t('toast.missingTitle'),
        description: t('toast.missingDescription'),
        variant: 'destructive',
      });
      return;
    }
    try {
      await createSession(form).unwrap();
      toast({ title: t('toast.createdTitle'), description: t('toast.createdDescription') });
      setAddDialogOpen(false);
      resetForm();
    } catch (error) {
      toast({
        title: t('toast.errorTitle'),
        description: t('toast.errorDescription'),
        variant: 'destructive',
      });
      // eslint-disable-next-line no-console
      console.error(error);
    }
  };

  const submitUpdate = async () => {
    if (!editSession) return;
    try {
      await updateSession({ id: editSession.id, body: form }).unwrap();
      toast({ title: t('toast.updatedTitle'), description: t('toast.updatedDescription') });
      setEditSession(null);
    } catch (error) {
      toast({
        title: t('toast.errorTitle'),
        description: t('toast.errorDescription'),
        variant: 'destructive',
      });
      console.error(error);
    }
  };

  const formatDate = (value: string) =>
    new Date(value).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

  return (
    <div className="flex w-full flex-col gap-6 px-4 py-8">
      <Card className="border-border/70">
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{t('title')}</CardTitle>
            <CardDescription>{t('description')}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => void refetch()} disabled={busy}>
              <RefreshCw className={cn('mr-2 size-4', busy && 'animate-spin')} aria-hidden />
              {t('actions.refresh')}
            </Button>
            <Button type="button" size="sm" onClick={openCreateDialog}>
              <Plus className="mr-2 size-4" aria-hidden />
              {t('actions.add')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/70 text-left rtl:text-right">
                <th className="py-3 pr-4 font-medium text-muted-foreground">{t('columns.phone')}</th>
                <th className="py-3 pr-4 font-medium text-muted-foreground">{t('columns.active')}</th>
                <th className="py-3 pr-4 font-medium text-muted-foreground">{t('columns.locked')}</th>
                <th className="py-3 pr-4 font-medium text-muted-foreground">{t('columns.updated')}</th>
                <th className="py-3 pr-4 font-medium text-muted-foreground">{t('columns.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {busy ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      <span>{t('loading')}</span>
                    </div>
                  </td>
                </tr>
              ) : sortedSessions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-muted-foreground">
                    {t('empty')}
                  </td>
                </tr>
              ) : (
                sortedSessions.map((session) => (
                  <tr key={session.id} className="border-b border-border/60 last:border-b-0">
                    <td className="py-3 pr-4 font-medium text-foreground">{session.phone}</td>
                    <td className="py-3 pr-4">
                      <StatusBadge active={session.active} labelActive={t('status.active')} labelInactive={t('status.inactive')} />
                    </td>
                    <td className="py-3 pr-4">
                      <StatusBadge
                        active={!session.locked}
                        labelActive={t('status.unlocked')}
                        labelInactive={t('status.locked')}
                        variant="locked"
                      />
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">{formatDate(session.updatedAt)}</td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isUpdating}
                          onClick={() => {
                            setEditSession(session);
                            setForm({
                              phone: session.phone,
                              jwt: session.jwt,
                              active: session.active,
                              locked: session.locked,
                            });
                          }}
                        >
                          <Edit3 className="mr-2 size-4" aria-hidden />
                          {t('actions.edit')}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={isUpdating}
                          onClick={() =>
                            updateSession({
                              id: session.id,
                              body: { active: !session.active },
                            }).unwrap()
                          }
                        >
                          {session.active ? t('actions.disable') : t('actions.enable')}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={isUpdating}
                          onClick={() =>
                            updateSession({
                              id: session.id,
                              body: { locked: !session.locked },
                            }).unwrap()
                          }
                        >
                          {session.locked ? (
                            <Unlock className="mr-2 size-4" aria-hidden />
                          ) : (
                            <Lock className="mr-2 size-4" aria-hidden />
                          )}
                          {session.locked ? t('actions.unlock') : t('actions.lock')}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('addDialog.title')}</DialogTitle>
            <DialogDescription>{t('addDialog.description')}</DialogDescription>
          </DialogHeader>
          <SessionForm form={form} onChange={setForm} />
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>
              {t('actions.cancel')}
            </Button>
            <Button type="button" onClick={() => void submitCreate()} disabled={isCreating}>
              {isCreating ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden /> : null}
              {t('actions.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editSession)} onOpenChange={(open) => !open && setEditSession(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('editDialog.title')}</DialogTitle>
            <DialogDescription>{t('editDialog.description')}</DialogDescription>
          </DialogHeader>
          <SessionForm form={form} onChange={setForm} />
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setEditSession(null)}>
              {t('actions.cancel')}
            </Button>
            <Button type="button" onClick={() => void submitUpdate()} disabled={isUpdating}>
              {isUpdating ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden /> : null}
              {t('actions.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type StatusBadgeProps = {
  active: boolean;
  labelActive: string;
  labelInactive: string;
  variant?: 'locked' | 'default';
};

function StatusBadge({ active, labelActive, labelInactive, variant = 'default' }: StatusBadgeProps) {
  const base = 'inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold';
  const activeClasses =
    variant === 'locked'
      ? 'bg-emerald-500/10 text-emerald-600'
      : 'bg-emerald-500/10 text-emerald-600';
  const inactiveClasses =
    variant === 'locked' ? 'bg-amber-500/10 text-amber-600' : 'bg-rose-500/10 text-rose-600';

  const icon = active ? (
    variant === 'locked' ? <Unlock className="size-3.5" aria-hidden /> : <ShieldCheck className="size-3.5" aria-hidden />
  ) : variant === 'locked' ? (
    <Lock className="size-3.5" aria-hidden />
  ) : (
    <LockOpen className="size-3.5" aria-hidden />
  );

  return (
    <span className={cn(base, active ? activeClasses : inactiveClasses)}>
      {icon}
      {active ? labelActive : labelInactive}
    </span>
  );
}

type SessionFormProps = {
  form: SessionFormState;
  onChange: (next: SessionFormState) => void;
};

function SessionForm({ form, onChange }: SessionFormProps) {
  const t = useTranslations('admin.divarSessions');

  return (
    <div className="space-y-4">
      <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
        {t('fields.phone')}
        <Input
          value={form.phone}
          onChange={(event) => onChange({ ...form, phone: event.target.value })}
          placeholder="+98912xxxxxxx"
          autoComplete="off"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-foreground">
        {t('fields.jwt')}
        <Textarea
          value={form.jwt}
          onChange={(event) => onChange({ ...form, jwt: event.target.value })}
          rows={4}
          placeholder={t('fields.jwtPlaceholder')}
        />
      </label>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm text-foreground">
          <Switch
            checked={form.active}
            onCheckedChange={(checked) => onChange({ ...form, active: checked })}
          />
          <span>{t('fields.active')}</span>
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <Switch
            checked={form.locked}
            onCheckedChange={(checked) => onChange({ ...form, locked: checked })}
          />
          <span>{t('fields.locked')}</span>
        </label>
      </div>
    </div>
  );
}
