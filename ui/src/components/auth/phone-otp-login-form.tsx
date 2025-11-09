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

const sanitizeIranLocalPhone = (input: string): string => {
  let digits = input.replace(/\D/g, '');
  if (digits.startsWith('0098')) {
    digits = digits.slice(4);
  } else if (digits.startsWith('098')) {
    digits = digits.slice(3);
  } else if (digits.startsWith('98')) {
    digits = digits.slice(2);
  }
  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return digits.slice(0, 10);
};

const isValidIranLocalPhone = (digits: string): boolean => /^9\d{9}$/.test(digits);

const toInternationalIranPhone = (digits: string): string => (digits ? `+98${digits}` : '');

const formatDisplayIranPhone = (digits: string): string => (digits ? `0${digits}` : '');

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
  const [lastRequestedPhoneLocal, setLastRequestedPhoneLocal] = useState<string | null>(null);

  const [requestOtp, { isLoading: isRequesting }] = useRequestOtpMutation();
  const [verifyOtp, { isLoading: isVerifying }] = useVerifyOtpMutation();

  const isAuthenticated = useMemo(() => Boolean(auth.accessToken), [auth.accessToken]);
  const displayPhone = formatDisplayIranPhone(lastRequestedPhoneLocal ?? phone) || '+98';

  const handleRequestOtp = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const sanitizedLocal = sanitizeIranLocalPhone(phone);

      if (!isValidIranLocalPhone(sanitizedLocal)) {
        toast({
          title: t('errors.invalidPhone'),
          variant: 'destructive',
        });
        return;
      }

      try {
        const international = toInternationalIranPhone(sanitizedLocal);
        await requestOtp({ phone: international }).unwrap();
        setStep('verify');
        setLastRequestedPhoneLocal(sanitizedLocal);
        toast({
          title: t('requestToast'),
          description: t('codeInfo', { phone: formatDisplayIranPhone(sanitizedLocal) }),
        });
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
      const localDigits = sanitizeIranLocalPhone(lastRequestedPhoneLocal ?? phone);
      const sanitizedCode = sanitizeCode(code);

      if (!isValidIranLocalPhone(localDigits)) {
        toast({
          title: t('errors.invalidPhone'),
          variant: 'destructive',
        });
        return;
      }

      if (!sanitizedCode || sanitizedCode.length < 4) {
        toast({
          title: t('errors.invalidCode'),
          variant: 'destructive',
        });
        return;
      }

      try {
        const response = await verifyOtp({
          phone: toInternationalIranPhone(localDigits),
          code: sanitizedCode,
        }).unwrap();
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
    [code, dispatch, lastRequestedPhoneLocal, phone, router, t, toast, verifyOtp],
  );

  const handleResend = useCallback(async () => {
    const localDigits = sanitizeIranLocalPhone(lastRequestedPhoneLocal ?? phone);
    if (!isValidIranLocalPhone(localDigits)) {
      return;
    }

    try {
      await requestOtp({ phone: toInternationalIranPhone(localDigits) }).unwrap();
      toast({
        title: t('requestToast'),
        description: t('codeInfo', { phone: formatDisplayIranPhone(localDigits) }),
      });
    } catch (error) {
      console.error('Failed to resend OTP', error);
      toast({
        title: t('errors.requestFailed'),
        variant: 'destructive',
      });
    }
  }, [lastRequestedPhoneLocal, phone, requestOtp, t, toast]);

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
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-medium text-muted-foreground">
                  +98
                </span>
                <Input
                  id="phone"
                  name="phone"
                  inputMode="tel"
                  autoComplete="tel-national"
                  placeholder={t('phonePlaceholder')}
                  value={phone}
                  onChange={(event) => setPhone(sanitizeIranLocalPhone(event.target.value))}
                  disabled={isRequesting}
                  required
                  dir="ltr"
                  className="pl-14 text-left"
                />
              </div>
              <p className="text-xs text-muted-foreground">{t('phoneHint')}</p>
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
              {t('codeDescription', {
                phone: displayPhone,
              })}
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
