'use client';

import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
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
const CODE_LENGTH = 4;

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

const sanitizeCode = (input: string) => input.replace(/\D/g, '').slice(0, CODE_LENGTH);

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
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const codeInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const codeRef = useRef(code);

  const [requestOtp, { isLoading: isRequesting }] = useRequestOtpMutation();
  const [verifyOtp, { isLoading: isVerifying }] = useVerifyOtpMutation();

  const isAuthenticated = useMemo(() => Boolean(auth.accessToken), [auth.accessToken]);
  const displayPhone = formatDisplayIranPhone(lastRequestedPhoneLocal ?? phone) || '+98';

  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  useEffect(() => {
    if (step === 'phone') {
      phoneInputRef.current?.focus();
    } else if (step === 'verify') {
      const digits = Array.from({ length: CODE_LENGTH }, (_, index) => codeRef.current[index] ?? '');
      const emptyIndex = digits.findIndex((digit) => !digit);
      const targetIndex = emptyIndex === -1 ? CODE_LENGTH - 1 : emptyIndex;
      codeInputRefs.current[targetIndex]?.focus();
    }
  }, [step]);

  const handleCodeInput = useCallback(
    (index: number) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = event.target.value;
      const value = rawValue.replace(/\D/g, '');
      const nextIndex = Math.min(index + value.length, CODE_LENGTH - 1);

      if (!value) {
        setCode((prev) => {
          const digits = Array.from(
            { length: CODE_LENGTH },
            (_, position) => prev[position] ?? '',
          );
          digits[index] = '';
          return digits.join('');
        });
        return;
      }

      setCode((prev) => {
        const digits = Array.from({ length: CODE_LENGTH }, (_, position) => prev[position] ?? '');
        const incoming = value.split('');
        let cursor = index;
        for (const digit of incoming) {
          if (cursor >= CODE_LENGTH) break;
          digits[cursor] = digit;
          cursor += 1;
        }
        return digits.join('');
      });

      codeInputRefs.current[nextIndex]?.focus();
    },
    [],
  );

  const handleCodeKeyDown = useCallback(
    (index: number) => (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Backspace') {
        event.preventDefault();
        setCode((prev) => {
          const digits = Array.from({ length: CODE_LENGTH }, (_, position) => prev[position] ?? '');
          if (digits[index]) {
            digits[index] = '';
            return digits.join('');
          }
          if (index > 0) {
            digits[index - 1] = '';
            codeInputRefs.current[index - 1]?.focus();
          }
          return digits.join('');
        });
        return;
      }

      if (event.key === 'ArrowLeft' && index > 0) {
        event.preventDefault();
        codeInputRefs.current[index - 1]?.focus();
      }

      if (event.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
        event.preventDefault();
        codeInputRefs.current[index + 1]?.focus();
      }
    },
    [],
  );

  const handleCodePaste = useCallback(
    (event: React.ClipboardEvent<HTMLDivElement>) => {
      const pasted = event.clipboardData.getData('text');
      const digits = sanitizeCode(pasted);
      if (!digits) {
        return;
      }
      event.preventDefault();
      setCode(digits);
      const targetIndex = Math.min(digits.length, CODE_LENGTH - 1);
      codeInputRefs.current[targetIndex]?.focus();
    },
    [],
  );

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

      if (!sanitizedCode || sanitizedCode.length < CODE_LENGTH) {
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
                  ref={phoneInputRef}
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
              <div
                className="flex items-center justify-center"
                onPaste={handleCodePaste}
                dir="ltr"
              >
                {Array.from({ length: CODE_LENGTH }, (_, index) => {
                  const digit = code[index] ?? '';
                  return (
                    <div key={`code-slot-${index}`} className="flex items-center">
                      <Input
                        id={index === 0 ? 'code' : undefined}
                        name="code"
                        type="password"
                        inputMode="numeric"
                        autoComplete={index === 0 ? 'one-time-code' : 'off'}
                        aria-label={t('codeLabel')}
                        value={digit}
                        onChange={handleCodeInput(index)}
                        onKeyDown={handleCodeKeyDown(index)}
                        disabled={isVerifying}
                        required
                        className="size-12 p-0 text-center text-lg font-semibold"
                        ref={(element) => {
                          codeInputRefs.current[index] = element;
                        }}
                      />
                      {index < CODE_LENGTH - 1 ? (
                        <span className="mx-2 text-sm text-muted-foreground">-</span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
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
