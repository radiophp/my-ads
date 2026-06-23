'use client';

import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Save } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  useGetAdminWebsiteSettingsQuery,
  useUpdateAdminWebsiteSettingsMutation,
} from '@/features/api/endpoints/website-settings';
import type { WebsiteContact, WebsiteSettings } from '@/types/website-settings';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

type WebsiteSettingsDraft = {
  phoneContacts: WebsiteContact[];
  instagramUrl: string;
  telegramChannelUrl: string;
  telegramBotUrl: string;
  baleBotUrl: string;
  aboutDescription: string;
  address: string;
  turnstileEnabled: boolean;
  taxPercentage: number;
};

const CONTACT_SLOTS = 5;
const emptyContact: WebsiteContact = { name: '', phone: '' };

const buildContacts = (value?: WebsiteContact[]): WebsiteContact[] => {
  const items = Array.isArray(value) ? value : [];
  const normalized = items.map((entry) => ({
    name: entry?.name ?? '',
    phone: entry?.phone ?? '',
  }));
  while (normalized.length < CONTACT_SLOTS) {
    normalized.push({ ...emptyContact });
  }
  return normalized.slice(0, CONTACT_SLOTS);
};

const normalizeField = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export function AdminWebsiteSettingsManager() {
  const t = useTranslations('admin.websiteSettings');
  const { toast } = useToast();
  const { data, isLoading, isFetching, refetch } = useGetAdminWebsiteSettingsQuery();
  const [updateSettings, { isLoading: isSaving }] = useUpdateAdminWebsiteSettingsMutation();

  const [draft, setDraft] = useState<WebsiteSettingsDraft>(() => ({
    phoneContacts: buildContacts(),
    instagramUrl: '',
    telegramChannelUrl: '',
    telegramBotUrl: '',
    baleBotUrl: '',
    aboutDescription: '',
    address: '',
    turnstileEnabled: false,
    taxPercentage: 0,
  }));

  useEffect(() => {
    if (!data) return;
    setDraft({
      phoneContacts: buildContacts(data.phoneContacts),
      instagramUrl: data.instagramUrl ?? '',
      telegramChannelUrl: data.telegramChannelUrl ?? '',
      telegramBotUrl: data.telegramBotUrl ?? '',
      baleBotUrl: data.baleBotUrl ?? '',
      aboutDescription: data.aboutDescription ?? '',
      address: data.address ?? '',
      turnstileEnabled: data.turnstileEnabled ?? false,
      taxPercentage: data.taxPercentage ?? 0,
    });
  }, [data]);

  const handleContactChange = (index: number, field: keyof WebsiteContact, value: string) => {
    setDraft((current) => {
      const nextContacts = current.phoneContacts.map((contact, contactIndex) =>
        contactIndex === index ? { ...contact, [field]: value } : contact,
      );
      return { ...current, phoneContacts: nextContacts };
    });
  };

  const payload = useMemo<Partial<WebsiteSettings>>(
    () => ({
      phoneContacts: draft.phoneContacts,
      instagramUrl: normalizeField(draft.instagramUrl),
      telegramChannelUrl: normalizeField(draft.telegramChannelUrl),
      telegramBotUrl: normalizeField(draft.telegramBotUrl),
      baleBotUrl: normalizeField(draft.baleBotUrl),
      aboutDescription: normalizeField(draft.aboutDescription),
      address: normalizeField(draft.address),
      turnstileEnabled: draft.turnstileEnabled,
      taxPercentage: draft.taxPercentage,
    }),
    [draft],
  );

  const handleSave = async () => {
    try {
      await updateSettings(payload).unwrap();
      toast({
        title: t('toast.savedTitle'),
        description: t('toast.savedDescription'),
      });
    } catch (error) {
      toast({
        title: t('toast.errorTitle'),
        description: t('toast.errorDescription'),
        variant: 'destructive',
      });
      console.error(error);
    }
  };

  const busy = isLoading || isFetching;

  return (
    <div className="flex w-full flex-col gap-6 px-4 py-8">
      <Card className="border-border/70">
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>{t('title')}</CardTitle>
            <CardDescription>{t('description')}</CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            disabled={busy}
          >
            <RefreshCw className={cn('mr-2 size-4', busy && 'animate-spin')} aria-hidden />
            {t('actions.refresh')}
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <section className="rounded-xl border border-border/60 p-4">
            <h3 className="text-sm font-semibold text-foreground">{t('sections.phones')}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{t('sections.phonesHint')}</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {draft.phoneContacts.map((contact, index) => (
                <div key={`contact-${index}`} className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t('fields.phoneLabel', { index: index + 1 })}
                  </span>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input
                      value={contact.name}
                      onChange={(event) =>
                        handleContactChange(index, 'name', event.target.value)
                      }
                      placeholder={t('fields.ownerPlaceholder')}
                    />
                    <Input
                      value={contact.phone}
                      onChange={(event) =>
                        handleContactChange(index, 'phone', event.target.value)
                      }
                      placeholder={t('fields.phonePlaceholder')}
                      dir="ltr"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-border/60 p-4">
            <h3 className="text-sm font-semibold text-foreground">{t('sections.social')}</h3>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  {t('fields.instagram')}
                </label>
                <Input
                  value={draft.instagramUrl}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, instagramUrl: event.target.value }))
                  }
                  placeholder={t('fields.instagramPlaceholder')}
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  {t('fields.telegramChannel')}
                </label>
                <Input
                  value={draft.telegramChannelUrl}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      telegramChannelUrl: event.target.value,
                    }))
                  }
                  placeholder={t('fields.telegramChannelPlaceholder')}
                  dir="ltr"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">
                  {t('fields.telegramBot')}
                </label>
                <Input
                  value={draft.telegramBotUrl}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      telegramBotUrl: event.target.value,
                    }))
                  }
                  placeholder={t('fields.telegramBotPlaceholder')}
                  dir="ltr"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">
                  {t('fields.baleBot')}
                </label>
                <Input
                  value={draft.baleBotUrl ?? ''}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      baleBotUrl: event.target.value,
                    }))
                  }
                  placeholder={t('fields.baleBotPlaceholder')}
                  dir="ltr"
                />
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border/60 p-4">
            <h3 className="text-sm font-semibold text-foreground">{t('sections.about')}</h3>
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  {t('fields.aboutDescription')}
                </label>
                <Textarea
                  value={draft.aboutDescription}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      aboutDescription: event.target.value,
                    }))
                  }
                  placeholder={t('fields.aboutDescriptionPlaceholder')}
                  rows={6}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  {t('fields.address')}
                </label>
                <Textarea
                  value={draft.address}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, address: event.target.value }))
                  }
                  placeholder={t('fields.addressPlaceholder')}
                  rows={3}
                />
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border/60 p-4">
            <h3 className="text-sm font-semibold text-foreground">{t('sections.security')}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{t('sections.securityHint')}</p>
            <div className="mt-4">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={draft.turnstileEnabled}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, turnstileEnabled: event.target.checked }))
                  }
                  className="size-5 rounded border-border accent-primary"
                />
                <span className="text-sm font-medium text-foreground">
                  {t('fields.turnstileEnabled')}
                </span>
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-border/60 p-4">
            <h3 className="text-sm font-semibold text-foreground">{t('sections.finance')}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{t('sections.financeHint')}</p>
            <div className="mt-4">
              <Label htmlFor="taxPercentage" className="text-sm font-medium">{t('fields.taxPercentage')}</Label>
              <div className="mt-2 flex items-center gap-2">
                <Input
                  id="taxPercentage"
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={draft.taxPercentage}
                  onChange={(e) => setDraft((c) => ({ ...c, taxPercentage: Number(e.target.value) }))}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
          </section>

          <div className="flex items-center gap-2">
            <Button type="button" onClick={() => void handleSave()} disabled={isSaving}>
              <Save className={cn('mr-2 size-4', isSaving && 'animate-pulse')} aria-hidden />
              {isSaving ? t('actions.saving') : t('actions.save')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
