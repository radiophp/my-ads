'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { AuthenticatedUser } from '@/types/auth';

type AlreadySignedInCardProps = {
  user: AuthenticatedUser;
};

export function AlreadySignedInCard({ user }: AlreadySignedInCardProps) {
  const t = useTranslations('landing.login');
  const router = useRouter();
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>{t('alreadySignedIn')}</CardTitle>
        <CardDescription>{t('signedInDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border border-border/60 bg-muted/40 p-4 text-sm">
          <p className="font-medium">{user.firstName ?? user.phone}</p>
          {user.email && <p className="text-muted-foreground">{user.email}</p>}
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full" onClick={() => router.push('/dashboard')}>
          {t('dashboardCta')}
        </Button>
      </CardFooter>
    </Card>
  );
}
