'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Smartphone, Loader2, CheckCircle2 } from 'lucide-react';

import { useBaleMiniAppAuthMutation, useConfirmDeviceMutation } from '@/features/api/endpoints/auth';
import { setAuth, setBaleMiniApp } from '@/features/auth/authSlice';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { getDeviceInfo } from '@/lib/device';
import { useBaleMiniApp } from '@/hooks/use-bale-miniapp';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { DeviceConfirmDialog } from '@/components/auth/device-confirm-dialog';

export function BaleMiniAppLogin() {
  const dispatch = useAppDispatch();
  const { toast } = useToast();

  const { initData, phone, contactStatus, requestContact } = useBaleMiniApp();
  const { accessToken, hydrated } = useAppSelector((s) => s.auth);
  const [baleMiniAppAuth, { isLoading: isAuthLoading }] = useBaleMiniAppAuthMutation();
  const [confirmDevice] = useConfirmDeviceMutation();
  const [pendingSessionToken, setPendingSessionToken] = useState<string | null>(null);
  const [currentDevice, setCurrentDevice] = useState<{ name: string | null; type: string | null; ipAddress: string | null; lastActiveAt: string } | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showDeviceDialog, setShowDeviceDialog] = useState(false);
  const [redirected, setRedirected] = useState(false);
  const authSentRef = useRef(false);

  useEffect(() => {
    localStorage.setItem('my-ads-bale-miniapp', '1');
    dispatch(setBaleMiniApp(true));
  }, [dispatch]);

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
        setRedirected(true);
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
  }, [baleMiniAppAuth, dispatch]);

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
      setRedirected(true);
    } catch {
      toast({ title: 'خطا', description: 'تأیید دستگاه با مشکل مواجه شد.' });
    }
  }, [pendingSessionToken, confirmDevice, dispatch, toast]);

  const handleCancelDevice = useCallback(() => {
    setShowDeviceDialog(false);
    setPendingSessionToken(null);
    setCurrentDevice(null);
  }, []);

  if (!hydrated) {
    return (
      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">در حال بارگذاری...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      {redirected || accessToken ? (
        <Card className="w-full">
          <CardHeader className="text-center">
            <CheckCircle2 className="mx-auto size-12 text-green-500" />
            <CardTitle className="text-xl">ورود موفق</CardTitle>
            <CardDescription>شما با موفقیت وارد شدید</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link
              href="/dashboard"
              className="inline-block rounded-md bg-primary px-6 py-3 text-primary-foreground hover:bg-primary/90"
            >
              ورود به داشبورد
            </Link>
          </CardContent>
        </Card>
      ) : (
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
                <Loader2 className="size-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  در حال ارسال درخواست به بله...
                </p>
              </div>
            ) : contactStatus === 'sent' ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <Loader2 className="size-8 animate-spin text-primary" />
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
                <Smartphone className="size-5" />
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
      )}

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
