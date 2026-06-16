'use client';

import { useTranslations } from 'next-intl';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { getDeviceDescription } from '@/lib/device';
import type { ChallengerDevice } from '@/features/auth/authSlice';

type DeviceChallengerDialogProps = {
  open: boolean;
  challengerDevice: ChallengerDevice | null;
  onClose: () => void;
};

export function DeviceChallengerDialog({
  open,
  challengerDevice,
  onClose,
}: DeviceChallengerDialogProps) {
  const t = useTranslations('auth.deviceChallenger');

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('title')}</AlertDialogTitle>
          <AlertDialogDescription>
            <div className="mb-2">{t('description')}</div>
            {challengerDevice && (
              <div className="rounded-md bg-muted p-3 text-sm">
                <p className="font-medium">
                  {getDeviceDescription(challengerDevice.name, challengerDevice.type)}
                </p>
                {challengerDevice.ipAddress && (
                  <p className="mt-1 text-muted-foreground">
                    {t('ip')}: {challengerDevice.ipAddress}
                  </p>
                )}
                <p className="text-muted-foreground">
                  {t('time')}: {new Date(challengerDevice.lastActiveAt).toLocaleString()}
                </p>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onClose}>
            {t('ok')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
