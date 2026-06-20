'use client';

import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';
import { LoadingLogo } from '@/components/ui/loading-logo';

import {
  useRequestOtpMutation,
  useBaleLoginMutation,
  useVerifyOtpMutation,
  useConfirmDeviceMutation,
  useCancelDeviceMutation,
  type ConfirmDeviceResponse,
} from '@/features/api/endpoints/auth';
import { useGetWebsiteSettingsQuery } from '@/features/api/endpoints/website-settings';
import { setAuth } from '@/features/auth/authSlice';
import { useBaleLinkSocket } from '@/features/bale/useBaleLinkSocket';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { cn, getDeviceInfo } from '@/lib/utils';
import { getDeviceInfo as getStructuredDeviceInfo } from '@/lib/device';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Turnstile } from '@marsidev/react-turnstile';

import {
  CODE_LENGTH,
  sanitizeIranLocalPhone,
  formatPhoneInput,
  isValidIranLocalPhone,
  toInternationalIranPhone,
  formatDisplayIranPhone,
  sanitizeCode,
} from '@/lib/phone-utils';
import { AlreadySignedInCard } from './already-signed-in-card';
import { BaleRequiredStep } from './bale-required-step';
import { CodeDigitSlot } from './code-digit-slot';
import { DeviceConfirmDialog } from './device-confirm-dialog';
import { DeviceSelectDialog } from './device-select-dialog';
import type { ActiveDeviceInfo } from '@/features/api/endpoints/auth';


type Step = 'phone' | 'verify' | 'bale_required';

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
  const [baleBotUrl, setBaleBotUrl] = useState<string | null>(null);
  const [baleLinkToken, setBaleLinkToken] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileLoaded, setTurnstileLoaded] = useState(false);
  const [turnstileLoading, setTurnstileLoading] = useState(true);
  const [turnstileTheme, setTurnstileTheme] = useState<'light' | 'dark'>('light');
  const turnstileLoadStartRef = useRef(0);
  const turnstileLoadTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [hasInteractedWithBot, setHasInteractedWithBot] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [pendingSessionToken, setPendingSessionToken] = useState<string | null>(null);
  const [pendingCurrentDevice, setPendingCurrentDevice] = useState<ConfirmDeviceResponse['currentDevice']>(null);
  const [pendingActiveDevices, setPendingActiveDevices] = useState<ActiveDeviceInfo[]>([]);
  const [requiresDeviceSelection, setRequiresDeviceSelection] = useState(false);
  const [isConfirmingDevice, setIsConfirmingDevice] = useState(false);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const baleLoginCallbackRef = useRef<() => void>(() => {});
  const formRef = useRef<HTMLFormElement>(null);

  useBaleLinkSocket({
    token: baleLinkToken,
    onLinked: () => baleLoginCallbackRef.current(),
  });

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const updateTheme = () => {
      const theme = document.documentElement.dataset.theme;
      setTurnstileTheme(theme === 'dark' ? 'dark' : 'light');
    };
    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (step !== 'bale_required' || !hasInteractedWithBot) {
      setCountdown(0);
      return;
    }
    setCountdown(15);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step, hasInteractedWithBot]);

  const codeInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const codeRef = useRef(code);

  const [requestOtp, { isLoading: isRequesting }] = useRequestOtpMutation();
  const [baleLogin, { isLoading: isBaleLoggingIn }] = useBaleLoginMutation();
  const [verifyOtp, { isLoading: isVerifying }] = useVerifyOtpMutation();
  const [confirmDevice] = useConfirmDeviceMutation();
  const [cancelDevice] = useCancelDeviceMutation();
  const { data: websiteSettings, isLoading: isWebsiteSettingsLoading } = useGetWebsiteSettingsQuery();

  const deviceInfoRef = useRef(getStructuredDeviceInfo());

  const isAuthenticated = useMemo(() => Boolean(auth.accessToken), [auth.accessToken]);
  const displayPhone = formatDisplayIranPhone(lastRequestedPhoneLocal ?? phone) || '+98';

  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  const turnstileEnabled = websiteSettings?.turnstileEnabled && !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (step === 'phone') {
      phoneInputRef.current?.focus();
      if (turnstileEnabled) {
        setTurnstileLoaded(false);
        turnstileLoadStartRef.current = Date.now();
        setTurnstileLoading(true);
      }
    } else if (step === 'verify') {
      const digits = Array.from({ length: CODE_LENGTH }, (_, index) => codeRef.current[index] ?? '');
      const emptyIndex = digits.findIndex((digit) => !digit);
      const targetIndex = emptyIndex === -1 ? CODE_LENGTH - 1 : emptyIndex;
      codeInputRefs.current[targetIndex]?.focus();
    }
  }, [step, turnstileEnabled]);

  useEffect(() => {
    return () => clearTimeout(turnstileLoadTimerRef.current);
  }, []);

  const handleCodeInput = useCallback(
    (index: number) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = event.target.value;
      const value = rawValue.replace(/\D/g, '');
      const nextIndex = Math.min(index + value.length, CODE_LENGTH - 1);

      if (!value) {
        setCode((prev) => {
          const digits = Array.from({ length: CODE_LENGTH }, (_, position) => prev[position] ?? '');
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
        toast({ title: t('errors.invalidPhone'), variant: 'destructive' });
        return;
      }

      try {
        const international = toInternationalIranPhone(sanitizedLocal);
        const response = await requestOtp({
          phone: international,
          deviceInfo: getDeviceInfo(),
          turnstileToken: turnstileToken ?? undefined,
        }).unwrap();

        if (response.viaBale) {
          setStep('verify');
          setBaleBotUrl(response.baleBotUrl ?? null);
          setLastRequestedPhoneLocal(sanitizedLocal);
          toast({ title: t('requestToast'), description: t('checkBale') });
        } else if (response.baleLinked === false && response.baleBotUrl) {
          setBaleBotUrl(response.baleBotUrl);
          setBaleLinkToken(response.baleLinkToken ?? null);
          setLastRequestedPhoneLocal(sanitizedLocal);
          setStep('bale_required');
        } else {
          setStep('verify');
          setLastRequestedPhoneLocal(sanitizedLocal);
          toast({
            title: t('requestToast'),
            description: t('codeInfo', { phone: formatDisplayIranPhone(sanitizedLocal) }),
          });
        }
      } catch (error) {
        console.error('Failed to request OTP', error);
        toast({ title: t('errors.requestFailed'), variant: 'destructive' });
      }
    },
    [phone, turnstileToken, requestOtp, t, toast],
  );

  const handleBaleLogin = useCallback(async () => {
    const localDigits = sanitizeIranLocalPhone(lastRequestedPhoneLocal ?? phone);
    if (!isValidIranLocalPhone(localDigits)) {
      toast({ title: t('errors.invalidPhone'), variant: 'destructive' });
      return;
    }

    try {
      const di = deviceInfoRef.current;
      const response = await baleLogin({
        phone: toInternationalIranPhone(localDigits),
        deviceId: di.deviceId,
        deviceName: di.deviceName,
        deviceType: di.deviceType,
        userAgent: di.userAgent,
      }).unwrap();

        if (response.status === 'confirm_device') {
          if (!response.currentDevice && !response.requiresDeviceSelection) {
            const confirmed = await confirmDevice({ pendingSessionToken: response.pendingSessionToken }).unwrap();
            dispatch(setAuth(confirmed));
            toast({ title: t('baleLoginSuccess') });
            router.push('/dashboard');
            return;
          }
          setPendingSessionToken(response.pendingSessionToken);
          setPendingCurrentDevice(response.currentDevice);
          if (response.requiresDeviceSelection && response.activeDevices) {
            setPendingActiveDevices(response.activeDevices);
            setRequiresDeviceSelection(true);
          } else {
            setPendingActiveDevices([]);
            setRequiresDeviceSelection(false);
          }
          return;
        }

        dispatch(setAuth(response));
        toast({ title: t('baleLoginSuccess') });
        router.push('/dashboard');
    } catch (error) {
      console.error('Bale login failed', error);
      toast({ title: t('baleLoginError'), variant: 'destructive' });
    }
  }, [baleLogin, confirmDevice, dispatch, lastRequestedPhoneLocal, phone, router, t, toast]);

  useEffect(() => {
    baleLoginCallbackRef.current = handleBaleLogin;
  }, [handleBaleLogin]);

  useEffect(() => {
    if (sanitizeCode(code).length === CODE_LENGTH) {
      formRef.current?.requestSubmit();
    }
  }, [code]);

  const handleVerifyOtp = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const localDigits = sanitizeIranLocalPhone(lastRequestedPhoneLocal ?? phone);
      const sanitizedCode = sanitizeCode(code);

      if (!isValidIranLocalPhone(localDigits)) {
        toast({ title: t('errors.invalidPhone'), variant: 'destructive' });
        return;
      }

      if (!sanitizedCode || sanitizedCode.length < CODE_LENGTH) {
        toast({ title: t('errors.invalidCode'), variant: 'destructive' });
        return;
      }

      try {
        const di = deviceInfoRef.current;
        const response = await verifyOtp({
          phone: toInternationalIranPhone(localDigits),
          code: sanitizedCode,
          deviceId: di.deviceId,
          deviceName: di.deviceName,
          deviceType: di.deviceType,
          userAgent: di.userAgent,
        }).unwrap();

        if (response.status === 'confirm_device') {
          if (!response.currentDevice && !response.requiresDeviceSelection) {
            const confirmed = await confirmDevice({ pendingSessionToken: response.pendingSessionToken }).unwrap();
            dispatch(setAuth(confirmed));
            toast({ title: t('successToast') });
            setCode('');
            router.push('/dashboard');
            return;
          }
          setPendingSessionToken(response.pendingSessionToken);
          setPendingCurrentDevice(response.currentDevice);
          if (response.requiresDeviceSelection && response.activeDevices) {
            setPendingActiveDevices(response.activeDevices);
            setRequiresDeviceSelection(true);
          } else {
            setPendingActiveDevices([]);
            setRequiresDeviceSelection(false);
          }
          return;
        }

        dispatch(setAuth(response));
        toast({ title: t('successToast') });
        setCode('');
        router.push('/dashboard');
      } catch (error) {
        console.error('Failed to verify OTP', error);
        toast({ title: t('errors.verifyFailed'), variant: 'destructive' });
      }
    },
    [code, confirmDevice, dispatch, lastRequestedPhoneLocal, phone, router, t, toast, verifyOtp],
  );

  const handleConfirmDevice = useCallback(async (deviceToReplace?: string) => {
    if (!pendingSessionToken) return;
    setIsConfirmingDevice(true);
    try {
      const response = await confirmDevice({ pendingSessionToken, deviceToReplace }).unwrap();
      dispatch(setAuth(response));
      toast({ title: t('successToast') });
      setCode('');
      setPendingSessionToken(null);
      setPendingCurrentDevice(null);
      setPendingActiveDevices([]);
      setRequiresDeviceSelection(false);
      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to confirm device', error);
      toast({ title: t('errors.verifyFailed'), variant: 'destructive' });
    } finally {
      setIsConfirmingDevice(false);
    }
  }, [pendingSessionToken, confirmDevice, dispatch, router, t, toast]);

  const handleCancelDevice = useCallback(async () => {
    if (!pendingSessionToken) return;
    try {
      await cancelDevice({ pendingSessionToken }).unwrap();
    } catch {
      // Ignore cancellation errors
    }
    setPendingSessionToken(null);
    setPendingCurrentDevice(null);
    setPendingActiveDevices([]);
    setRequiresDeviceSelection(false);
  }, [pendingSessionToken, cancelDevice]);

  const handleResend = useCallback(async () => {
    const localDigits = sanitizeIranLocalPhone(lastRequestedPhoneLocal ?? phone);
    if (!isValidIranLocalPhone(localDigits)) {
      return;
    }

    try {
      const response = await requestOtp({ phone: toInternationalIranPhone(localDigits), deviceInfo: getDeviceInfo() }).unwrap();
      if (response.viaBale) {
        setBaleBotUrl(response.baleBotUrl ?? null);
        toast({ title: t('requestToast'), description: t('checkBale') });
      } else {
        toast({
          title: t('requestToast'),
          description: t('codeInfo', { phone: formatDisplayIranPhone(localDigits) }),
        });
      }
    } catch (error) {
      console.error('Failed to resend OTP', error);
      toast({ title: t('errors.requestFailed'), variant: 'destructive' });
    }
  }, [lastRequestedPhoneLocal, phone, requestOtp, t, toast]);

  if (auth.hydrated && isAuthenticated && auth.user) {
    return <AlreadySignedInCard user={auth.user} />;
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        {step === 'bale_required' ? (
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setStep('phone');
                setCode('');
                setTurnstileToken(null);
                setBaleLinkToken(null);
                setHasInteractedWithBot(false);
              }}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary"
            >
              <ArrowRight className="size-3.5" aria-hidden />
              {t('changePhone')}
            </button>
            <CardTitle className="text-base">{t('baleTitle')}</CardTitle>
          </div>
        ) : (
          <CardTitle>{t('title')}</CardTitle>
        )}
        {step === 'phone' && <CardDescription>{t('description')}</CardDescription>}
      </CardHeader>

      {step === 'phone' ? (
        <form onSubmit={handleRequestOtp} noValidate>
          <CardContent className="space-y-6">
            <div className="space-y-3">
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
                  onChange={(event) => setPhone(formatPhoneInput(event.target.value))}
                  disabled={isRequesting}
                  required
                  dir="ltr"
                  className="pl-14 text-left"
                  ref={phoneInputRef}
                />
              </div>
            </div>
            {websiteSettings?.turnstileEnabled && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
              <div className="flex justify-center">
                <Turnstile
                  siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
                  onSuccess={setTurnstileToken}
                  onWidgetLoad={() => {
                    const elapsed = Date.now() - turnstileLoadStartRef.current;
                    const remaining = 300 - elapsed;
                    turnstileLoadTimerRef.current = setTimeout(() => {
                      setTurnstileLoaded(true);
                      setTurnstileLoading(false);
                    }, Math.max(0, remaining));
                  }}
                  onError={() => {
                    clearTimeout(turnstileLoadTimerRef.current);
                    setTurnstileLoading(false);
                  }}
                  options={{ theme: turnstileTheme, language: 'fa' }}
                />
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isRequesting || isWebsiteSettingsLoading || (!!websiteSettings?.turnstileEnabled && !turnstileLoaded)}>
              <div className="flex items-center gap-2">
                {(isWebsiteSettingsLoading || (turnstileEnabled && turnstileLoading)) && <LoadingLogo size="sm" />}
                {isRequesting ? t('requesting') : t('requestCode')}
              </div>
            </Button>
          </CardFooter>
        </form>
      ) : step === 'bale_required' ? (
        <CardContent className="space-y-6">
          <BaleRequiredStep
            baleBotUrl={baleBotUrl}
            baleLinkToken={baleLinkToken}
            isMobile={isMobile}
            hasInteractedWithBot={hasInteractedWithBot}
            countdown={countdown}
            isBaleLoggingIn={isBaleLoggingIn}
            onOpenBot={() => {
              setHasInteractedWithBot(true);
              window.open(`${baleBotUrl}?start=${baleLinkToken ? `link_${baleLinkToken}` : 'signup'}`, '_blank', 'noopener');
            }}
            onCopyBotUrl={() => {
              setHasInteractedWithBot(true);
              navigator.clipboard.writeText(`${baleBotUrl}?start=${baleLinkToken ? `link_${baleLinkToken}` : 'signup'}`);
              toast({ title: t('botUrlCopied') });
            }}
            onBaleLogin={handleBaleLogin}
          />
        </CardContent>
      ) : (
        <form ref={formRef} onSubmit={handleVerifyOtp} noValidate>
          <CardContent className="space-y-6">
            <p className="text-sm text-muted-foreground">
              {t('codeDescription', { phone: displayPhone })}
            </p>
            <div className="space-y-3">
              <Label htmlFor="code">{t('codeLabel')}</Label>
              <div
                className="flex items-center justify-center"
                onPaste={handleCodePaste}
                dir="ltr"
              >
                {Array.from({ length: CODE_LENGTH }, (_, index) => (
                  <CodeDigitSlot
                    key={`code-slot-${index}`}
                    index={index}
                    code={code}
                    disabled={isVerifying}
                    onInput={handleCodeInput}
                    onKeyDown={handleCodeKeyDown}
                    onRef={(i, element) => {
                      codeInputRefs.current[i] = element;
                    }}
                  />
                ))}
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
                    setTurnstileToken(null);
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
        </form>
      )}
      <DeviceConfirmDialog
        open={!!pendingSessionToken && !requiresDeviceSelection}
        currentDevice={pendingCurrentDevice}
        onConfirm={() => handleConfirmDevice()}
        onCancel={handleCancelDevice}
        isLoading={isConfirmingDevice}
      />
      <DeviceSelectDialog
        open={!!pendingSessionToken && requiresDeviceSelection}
        activeDevices={pendingActiveDevices}
        onConfirm={(deviceToReplace) => handleConfirmDevice(deviceToReplace)}
        onCancel={handleCancelDevice}
        isLoading={isConfirmingDevice}
      />
    </Card>
  );
}
