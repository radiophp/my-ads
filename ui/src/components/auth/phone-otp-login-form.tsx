'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { useRequestOtpMutation, useVerifyOtpMutation } from '@/features/api/apiSlice';
import { setAuth } from '@/features/auth/authSlice';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

type Step = 'phone' | 'verify';

const sanitizePhone = (input: string) =>
  input
    .replace(/[^\d+]/g, '')
    .replace(/(?!^)\+/g, '')
    .trim();

const sanitizeCode = (input: string) => input.replace(/\D/g, '').slice(0, 6);

export function PhoneOtpLoginForm() {
  const t = useTranslations('landing.login');
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { toast } = useToast();

  const auth = useAppSelector((state) => state.auth);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<Step>('phone');
  const [lastRequestedPhone, setLastRequestedPhone] = useState<string | null>(null);

  const [requestOtp, { isLoading: isRequesting }] = useRequestOtpMutation();
  const [verifyOtp, { isLoading: isVerifying }] = useVerifyOtpMutation();

  const isAuthenticated = useMemo(() => Boolean(auth.accessToken), [auth.accessToken]);

  const handleRequestOtp = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const sanitized = sanitizePhone(phone);

      if (!sanitized || sanitized.length < 6) {
        toast({
          title: t('errors.invalidPhone'),
          variant: 'destructive',
        });
        return;
      }

      try {
        await requestOtp({ phone: sanitized }).unwrap();
        setStep('verify');
        setLastRequestedPhone(sanitized);
        toast({ title: t('requestToast'), description: t('codeInfo', { phone: sanitized }) });
      } catch (error) {
        console.error('Failed to request OTP', error);
        toast({
          title: t('errors.requestFailed'),
          variant: 'destructive',
        });
      }
    },
    [phone, requestOtp, t, toast],
  );

  const handleVerifyOtp = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const sanitizedPhone = sanitizePhone(lastRequestedPhone ?? phone);
      const sanitizedCode = sanitizeCode(code);

      if (!sanitizedCode || sanitizedCode.length < 4) {
        toast({
          title: t('errors.invalidCode'),
          variant: 'destructive',
        });
        return;
      }

      try {
        const response = await verifyOtp({ phone: sanitizedPhone, code: sanitizedCode }).unwrap();
        dispatch(setAuth(response));
        toast({ title: t('successToast') });
        setCode('');
        router.push('/dashboard');
      } catch (error) {
        console.error('Failed to verify OTP', error);
        toast({
          title: t('errors.verifyFailed'),
          variant: 'destructive',
        });
      }
    },
    [code, dispatch, lastRequestedPhone, phone, router, t, toast, verifyOtp],
  );

  const handleResend = useCallback(async () => {
    const sanitized = sanitizePhone(lastRequestedPhone ?? phone);
    if (!sanitized) {
      return;
    }

    try {
      await requestOtp({ phone: sanitized }).unwrap();
      toast({ title: t('requestToast'), description: t('codeInfo', { phone: sanitized }) });
    } catch (error) {
      console.error('Failed to resend OTP', error);
      toast({
        title: t('errors.requestFailed'),
        variant: 'destructive',
      });
    }
  }, [lastRequestedPhone, phone, requestOtp, t, toast]);

  if (auth.hydrated && isAuthenticated && auth.user) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>{t('alreadySignedIn')}</CardTitle>
          <CardDescription>{t('signedInDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border/60 bg-muted/40 p-4 text-sm">
            <p className="font-medium">{auth.user.firstName ?? auth.user.phone}</p>
            {auth.user.email && <p className="text-muted-foreground">{auth.user.email}</p>}
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

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      {step === 'phone' ? (
        <form onSubmit={handleRequestOtp} noValidate>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="phone">{t('phoneLabel')}</Label>
              <Input
                id="phone"
                name="phone"
                inputMode="tel"
                autoComplete="tel"
                placeholder={t('phonePlaceholder')}
                value={phone}
                onChange={(event) => setPhone(sanitizePhone(event.target.value))}
                disabled={isRequesting}
                required
                dir="ltr"
                className="text-left"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isRequesting}>
              {isRequesting ? t('requesting') : t('requestCode')}
            </Button>
          </CardFooter>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} noValidate>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('codeDescription', { phone: lastRequestedPhone ?? phone })}
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="code">{t('codeLabel')}</Label>
              <Input
                id="code"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder={t('codePlaceholder')}
                value={code}
                onChange={(event) => setCode(sanitizeCode(event.target.value))}
                disabled={isVerifying}
                required
                dir="ltr"
                className="text-left tracking-[0.5em]"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <button
                type="button"
                className={cn(
                  'text-muted-foreground transition-colors hover:text-primary',
                  isVerifying && 'pointer-events-none opacity-60',
                )}
                onClick={() => {
                  setStep('phone');
                  setCode('');
                }}
              >
                {t('changePhone')}
              </button>
              <button
                type="button"
                className={cn(
                  'text-muted-foreground transition-colors hover:text-primary',
                  isRequesting && 'pointer-events-none opacity-60',
                )}
                onClick={handleResend}
                disabled={isRequesting}
              >
                {t('resend')}
              </button>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isVerifying}>
              {isVerifying ? t('verifying') : t('verifyCode')}
            </Button>
          </CardFooter>
        </form>
      )}
    </Card>
  );
}
