import { Instagram, MapPin, Phone, Send } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { buildSeoMetadata } from '@/lib/server/seo';
import { fetchWebsiteSettings } from '@/lib/server/website-settings';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';

export async function generateMetadata() {
  const t = await getTranslations('about');
  return buildSeoMetadata({
    pageKey: 'about',
    defaultTitle: t('title'),
    defaultDescription: t('description'),
    canonicalPath: '/about',
  });
}

export default async function AboutPage() {
  const t = await getTranslations('about');
  const settings = await fetchWebsiteSettings();
  const aboutBody = settings?.aboutDescription?.trim() || t('body');
  const address = settings?.address?.trim();
  const phoneContacts = settings?.phoneContacts ?? [];
  const instagramUrl = settings?.instagramUrl?.trim();
  const telegramChannelUrl = settings?.telegramChannelUrl?.trim();
  const telegramBotUrl = settings?.telegramBotUrl?.trim();
  const hasSocialLinks = Boolean(instagramUrl || telegramChannelUrl || telegramBotUrl);
  const hasContactSection = Boolean(address || phoneContacts.length > 0 || hasSocialLinks);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-12">
      <header className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {t('title')}
        </h1>
        <Breadcrumbs force className="px-0 pt-0" />
        <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">{t('description')}</p>
      </header>
      <div className="whitespace-pre-line rounded-2xl border border-border/70 bg-muted/30 p-6 text-base leading-8 text-foreground">
        {aboutBody}
      </div>
      {hasContactSection && (
        <section className="rounded-2xl border border-border/70 bg-background p-6">
          <h2 className="text-lg font-semibold text-foreground">{t('contactTitle')}</h2>
          <div className="mt-4 grid gap-4 text-sm text-muted-foreground sm:grid-cols-2">
            {address && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-foreground">
                  <MapPin className="size-4 text-primary" aria-hidden />
                  <p className="text-xs font-medium">{t('addressLabel')}</p>
                </div>
                <p className="text-sm text-muted-foreground">{address}</p>
              </div>
            )}
            {phoneContacts.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-foreground">
                  <Phone className="size-4 text-primary" aria-hidden />
                  <p className="text-xs font-medium">{t('phoneLabel')}</p>
                </div>
                <div className="space-y-2">
                  {phoneContacts.map((contact, index) => (
                    <div key={`${contact.phone}-${index}`} className="flex flex-col text-sm">
                      <span className="text-foreground">{contact.name || t('ownerLabel')}</span>
                      <span dir="ltr" className="text-muted-foreground">
                        {contact.phone}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {hasSocialLinks && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-foreground">{t('socialLabel')}</p>
                <div className="space-y-2">
                  {instagramUrl && (
                    <a
                      href={instagramUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-sm text-foreground transition hover:text-primary"
                    >
                      <Instagram className="size-4 text-primary" aria-hidden />
                      {t('instagramLabel')}
                    </a>
                  )}
                  {telegramChannelUrl && (
                    <a
                      href={telegramChannelUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-sm text-foreground transition hover:text-primary"
                    >
                      <Send className="size-4 text-primary" aria-hidden />
                      {t('telegramChannelLabel')}
                    </a>
                  )}
                  {telegramBotUrl && (
                    <a
                      href={telegramBotUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-sm text-foreground transition hover:text-primary"
                    >
                      <Send className="size-4 text-primary" aria-hidden />
                      {t('telegramBotLabel')}
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
