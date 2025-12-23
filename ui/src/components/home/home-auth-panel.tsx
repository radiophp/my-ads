'use client';

import { useTranslations } from 'next-intl';

import { PhoneOtpLoginForm } from '@/components/auth/phone-otp-login-form';
import { useAppSelector } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/routing';
import { cn } from '@/lib/utils';

export function HomeAuthPanel() {
  const t = useTranslations('landing');
  const auth = useAppSelector((state) => state.auth);
  const isAuthenticated = Boolean(auth.accessToken);

  if (!isAuthenticated) {
    return <PhoneOtpLoginForm />;
  }

  return (
    <div className={cn('rounded-xl border shadow-lg', 'bg-card/70 border-border/70')}>
      <div className="p-8">
        <h2 className="text-2xl font-semibold tracking-tight">{t('login.alreadySignedIn')}</h2>
        <p className="mt-2 text-muted-foreground">{t('login.signedInDescription')}</p>
        <Button asChild className="mt-6 w-full sm:w-auto">
          <Link href="/dashboard">{t('login.dashboardCta')}</Link>
        </Button>
      </div>
    </div>
  );
}
