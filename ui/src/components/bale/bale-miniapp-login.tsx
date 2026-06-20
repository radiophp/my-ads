'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Smartphone, Loader2 } from 'lucide-react';

import { useBaleMiniAppAuthMutation, useConfirmDeviceMutation } from '@/features/api/endpoints/auth';
import { setAuth } from '@/features/auth/authSlice';
import { useAppDispatch } from '@/lib/hooks';
import { getDeviceInfo } from '@/lib/device';
import { useBaleMiniApp } from '@/hooks/use-bale-miniapp';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { DeviceConfirmDialog } from '@/components/auth/device-confirm-dialog';

export function BaleMiniAppLogin() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { toast } = useToast();

  const { initData, phone, contactStatus, requestContact } = useBaleMiniApp();
  const [baleMiniAppAuth, { isLoading: isAuthLoading }] = useBaleMiniAppAuthMutation();
  const [confirmDevice] = useConfirmDeviceMutation();
  const [pendingSessionToken, setPendingSessionToken] = useState<string | null>(null);
  const [currentDevice, setCurrentDevice] = useState<{ name: string | null; type: string | null; ipAddress: string | null; lastActiveAt: string } | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showDeviceDialog, setShowDeviceDialog] = useState(false);
  const authSentRef = useRef(false);

  const callAuth = useCallback(async (id: string, phoneNumber?: string | null, deviceInfo?: ReturnType<typeof getDeviceInfo>) => {
    try {
      const result = await baleMiniAppAuth({
        initData: id,
        phone: phoneNumber ?? undefined,
        ...deviceInfo,
      }).unwrap();

      if (result.status === 'authenticated') {
        dispatch(setAuth({
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          user: result.user,
        }));
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        router.push('/dashboard');
        return true;
      }

      if (result.status === 'confirm_device') {
        setPendingSessionToken(result.pendingSessionToken);
        setCurrentDevice(result.currentDevice);
        setShowDeviceDialog(true);
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }, [baleMiniAppAuth, dispatch, router]);

  useEffect(() => {
    if (!initData) return;
    if (authSentRef.current) return;
    authSentRef.current = true;

    const deviceInfo = getDeviceInfo();
    callAuth(initData, null, deviceInfo);
  }, [initData, callAuth]);

  useEffect(() => {
    if (!phone) return;
    if (!initData) return;

    const deviceInfo = getDeviceInfo();
    callAuth(initData, phone, deviceInfo);
  }, [phone, initData, callAuth]);

  useEffect(() => {
    if (contactStatus !== 'sent') return;
    if (!initData) return;

    pollingRef.current = setInterval(async () => {
      const deviceInfo = getDeviceInfo();
      const ok = await callAuth(initData, phone, deviceInfo);
      if (ok && pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }, 1500);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [contactStatus, initData, phone, callAuth]);

  const handleSharePhone = useCallback(() => {
    requestContact();
  }, [requestContact]);

  const handleConfirmDevice = useCallback(async () => {
    if (!pendingSessionToken) return;
    try {
      const result = await confirmDevice({ pendingSessionToken }).unwrap();
      dispatch(setAuth({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
      }));
      setShowDeviceDialog(false);
      router.push('/dashboard');
    } catch {
      toast({ title: 'خطا', description: 'تأیید دستگاه با مشکل مواجه شد.' });
    }
  }, [pendingSessionToken, confirmDevice, dispatch, router, toast]);

  const handleCancelDevice = useCallback(() => {
    setShowDeviceDialog(false);
    setPendingSessionToken(null);
    setCurrentDevice(null);
  }, []);

  return (
    <>
      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">ورود با پیام‌رسان بله</CardTitle>
          <CardDescription>
            برای ورود به ماهان فایل، شماره تماس خود را از طریق بله ارسال کنید
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {contactStatus === 'requesting' ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                در حال ارسال درخواست به بله...
              </p>
            </div>
          ) : contactStatus === 'sent' ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                شماره تماس ارسال شد. در حال برقراری ارتباط...
              </p>
            </div>
          ) : contactStatus === 'unavailable' ? (
            <div className="space-y-3 text-center">
              <p className="text-sm text-muted-foreground">
                سرویس اشتراک‌گذاری شماره در دسترس نیست.
              </p>
              <p className="text-xs text-muted-foreground">
                لطفاً صفحه را از داخل پیام‌رسان بله باز کنید
              </p>
            </div>
          ) : (
            <Button
              className="w-full gap-2"
              size="lg"
              onClick={handleSharePhone}
              disabled={isAuthLoading}
            >
              <Smartphone className="h-5 w-5" />
              اشتراک‌گذاری شماره تماس
            </Button>
          )}

          {isAuthLoading && (
            <p className="text-center text-xs text-muted-foreground">
              در حال بررسی اطلاعات...
            </p>
          )}
        </CardContent>
      </Card>

      <DeviceConfirmDialog
        open={showDeviceDialog}
        currentDevice={currentDevice}
        onConfirm={handleConfirmDevice}
        onCancel={handleCancelDevice}
        isLoading={isAuthLoading}
      />
    </>
  );
}
