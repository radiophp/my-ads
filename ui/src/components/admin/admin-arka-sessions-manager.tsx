'use client';

import { useMemo, useState } from 'react';
import { Edit3, Loader2, Lock, LockOpen, Plus, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  useCreateAdminArkaSessionMutation,
  useGetAdminArkaSessionsQuery,
  useUpdateAdminArkaSessionMutation,
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
import type { AdminArkaSession } from '@/types/admin-arka-session';

type SessionFormState = {
  label: string;
  headersRaw: string;
  active: boolean;
  locked: boolean;
  lastError: string | null;
};

export function AdminArkaSessionsManager() {
  const t = useTranslations('admin.arkaSessions');
  const { toast } = useToast();
  const { data: sessions = [], isLoading, isFetching, refetch } = useGetAdminArkaSessionsQuery();
  const [createSession, { isLoading: isCreating }] = useCreateAdminArkaSessionMutation();
  const [updateSession, { isLoading: isUpdating }] = useUpdateAdminArkaSessionMutation();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editSession, setEditSession] = useState<AdminArkaSession | null>(null);
  const [form, setForm] = useState<SessionFormState>({
    label: '',
    headersRaw: '',
    active: true,
    locked: false,
    lastError: null,
  });

  const busy = isLoading || isFetching;

  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1)),
    [sessions],
  );

  const resetForm = () =>
    setForm({
      label: '',
      headersRaw: '',
      active: true,
      locked: false,
      lastError: null,
    });

  const openCreateDialog = () => {
    resetForm();
    setAddDialogOpen(true);
  };

  const submitCreate = async () => {
    if (!form.headersRaw.trim()) {
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
                <th className="py-3 pr-4 font-medium text-muted-foreground">{t('columns.label')}</th>
                <th className="py-3 pr-4 font-medium text-muted-foreground">{t('columns.active')}</th>
                <th className="py-3 pr-4 font-medium text-muted-foreground">{t('columns.locked')}</th>
                <th className="py-3 pr-4 font-medium text-muted-foreground">{t('columns.status')}</th>
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
                    <td className="py-3 pr-4 font-medium text-foreground">{session.label}</td>
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
                    <td className="py-3 pr-4">
                      {session.lastError ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs text-red-800 dark:bg-red-900/30 dark:text-red-100">
                          {t('status.error')} • {session.lastError}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-100">
                          {t('status.ok')}
                        </span>
                      )}
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
                              label: session.label,
                              headersRaw: session.headersRaw,
                              active: session.active,
                              locked: session.locked,
                              lastError: session.lastError,
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
            <DialogTitle>{t('dialog.addTitle')}</DialogTitle>
            <DialogDescription>{t('dialog.addDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t('fields.label')}</label>
              <Input
                value={form.label}
                onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
                placeholder={t('placeholders.label')}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t('fields.headers')}</label>
              <Textarea
                value={form.headersRaw}
                onChange={(e) => setForm((prev) => ({ ...prev, headersRaw: e.target.value }))}
                placeholder={t('placeholders.headers')}
                rows={8}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.active}
                  onCheckedChange={(checked) => setForm((prev) => ({ ...prev, active: checked }))}
                />
                <span className="text-sm">{t('fields.active')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.locked}
                  onCheckedChange={(checked) => setForm((prev) => ({ ...prev, locked: checked }))}
                />
                <span className="text-sm">{t('fields.locked')}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setAddDialogOpen(false)}>
              {t('actions.cancel')}
            </Button>
            <Button type="button" onClick={submitCreate} disabled={isCreating}>
              {isCreating && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
              {t('actions.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editSession)} onOpenChange={(open) => (!open ? setEditSession(null) : null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('dialog.editTitle')}</DialogTitle>
            <DialogDescription>{t('dialog.editDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t('fields.label')}</label>
              <Input
                value={form.label}
                onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
                placeholder={t('placeholders.label')}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t('fields.headers')}</label>
              <Textarea
                value={form.headersRaw}
                onChange={(e) => setForm((prev) => ({ ...prev, headersRaw: e.target.value }))}
                placeholder={t('placeholders.headers')}
                rows={8}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.active}
                  onCheckedChange={(checked) => setForm((prev) => ({ ...prev, active: checked }))}
                />
                <span className="text-sm">{t('fields.active')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.locked}
                  onCheckedChange={(checked) => setForm((prev) => ({ ...prev, locked: checked }))}
                />
                <span className="text-sm">{t('fields.locked')}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setEditSession(null)}>
              {t('actions.cancel')}
            </Button>
            <Button type="button" onClick={submitUpdate} disabled={isUpdating}>
              {isUpdating && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
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
  variant?: 'locked';
};

function StatusBadge({ active, labelActive, labelInactive, variant }: StatusBadgeProps) {
  const Icon = variant === 'locked' ? (active ? LockOpen : Lock) : active ? LockOpen : Lock;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs',
        active ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-100' : 'bg-muted text-muted-foreground',
      )}
    >
      <Icon className="size-3" aria-hidden />
      {active ? labelActive : labelInactive}
    </span>
  );
}
