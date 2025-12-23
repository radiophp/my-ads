'use client';
import { useTranslations } from 'next-intl';

import { PhoneOtpLoginForm } from '@/components/auth/phone-otp-login-form';
import { useAppSelector } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import { HomeCategoryKpis } from '@/components/home/home-category-kpis';

export function HomeLanding() {
  const t = useTranslations('landing');
  const auth = useAppSelector((state) => state.auth);
  const isAuthenticated = Boolean(auth.accessToken);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-4">
      <main className="grid w-full gap-10 py-20 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start">
        <section className="space-y-5">
          <div className="inline-flex rounded-full border border-border/70 bg-muted px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('badge')}
          </div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{t('title')}</h1>
          <p className="text-lg text-muted-foreground sm:text-xl">{t('subtitle')}</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>{t('bullets.otp')}</li>
            <li>{t('bullets.dashboard')}</li>
            <li>{t('bullets.localization')}</li>
          </ul>
        </section>
        <section>
          {isAuthenticated ? (
            <div className={cn('rounded-xl border shadow-lg', 'bg-card/70 border-border/70')}>
              <div className="p-8">
                <h2 className="text-2xl font-semibold tracking-tight">
                  {t('login.alreadySignedIn')}
                </h2>
                <p className="mt-2 text-muted-foreground">{t('login.signedInDescription')}</p>
                <Button asChild className="mt-6 w-full sm:w-auto">
                  <Link href="/dashboard">{t('login.dashboardCta')}</Link>
                </Button>
              </div>
            </div>
          ) : (
            <PhoneOtpLoginForm />
          )}
        </section>
      </main>
      <HomeCategoryKpis />
    </div>
  );
}
