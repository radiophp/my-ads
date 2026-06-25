'use client';

import { useState, useEffect } from 'react';
import { Loader2, Save, Trash2, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { PACKAGE_FEATURES } from '@/components/admin/constants/package-features.constants';
import {
  useGetUserFeatureOverridesQuery,
  useUpsertUserFeatureOverrideMutation,
  useDeleteUserFeatureOverrideMutation,
} from '@/features/api/endpoints/users';

type UserFeatureOverrideDialogProps = {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function UserFeatureOverrideDialog({ userId, open, onOpenChange }: UserFeatureOverrideDialogProps) {
  const ft = useTranslations('admin.packages.form.capabilityFormLabels');
  const { toast } = useToast();
  const { data: overrides = [], isFetching } = useGetUserFeatureOverridesQuery(userId, { skip: !open });
  const [upsert] = useUpsertUserFeatureOverrideMutation();
  const [remove] = useDeleteUserFeatureOverrideMutation();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (overrides.length > 0) {
      const d: Record<string, string> = {};
      for (const o of overrides) d[o.featureKey] = String(o.limitValue);
      setDrafts(d);
    }
  }, [overrides]);

  const handleSave = async (featureKey: string) => {
    const raw = drafts[featureKey];
    const limitValue = Number.parseInt(raw, 10);
    if (Number.isNaN(limitValue) || limitValue < 0) return;
    try {
      await upsert({ userId, featureKey, limitValue }).unwrap();
      toast({ title: 'ذخیره شد' });
    } catch {
      toast({ title: 'خطا در ذخیره', variant: 'destructive' });
    }
  };

  const handleRemove = async (featureKey: string) => {
    try {
      await remove({ userId, featureKey }).unwrap();
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[featureKey];
        return next;
      });
      toast({ title: 'حذف شد' });
    } catch {
      toast({ title: 'خطا در حذف', variant: 'destructive' });
    }
  };

  const overriddenKeys = new Set(overrides.map((o) => o.featureKey));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>تنظیمات ویژگی‌های کاربر</DialogTitle>
          <DialogDescription>مقادیر وارد شده جایگزین مقادیر پکیج می‌شوند</DialogDescription>
        </DialogHeader>
        {isFetching ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(PACKAGE_FEATURES).map(([key]) => {
              const hasOverride = overriddenKeys.has(key);
              return (
                <div key={key} className="flex items-center gap-2 rounded-lg border border-border/60 p-3">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{ft(key)}</div>
                    <div className="text-xs text-muted-foreground">
                      {hasOverride ? 'مقدار جایگزین' : 'مقدار پیش‌فرض پکیج'}
                    </div>
                  </div>
                  {hasOverride && (
                    <>
                      <Input
                        type="number"
                        min={0}
                        className="h-8 w-24"
                        value={drafts[key] ?? ''}
                        onChange={(e) => setDrafts((prev) => ({ ...prev, [key]: e.target.value }))}
                      />
                      <Button size="sm" variant="ghost" onClick={() => handleSave(key)}>
                        <Save className="size-4 text-green-600" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleRemove(key)}>
                        <Trash2 className="size-4 text-red-500" />
                      </Button>
                    </>
                  )}
                  {!hasOverride && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setDrafts((prev) => ({ ...prev, [key]: '0' }));
                        handleSave(key);
                      }}
                    >
                      <Plus className="size-4 ml-1" />
                      افزودن
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
