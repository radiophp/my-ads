'use client';

import { useTranslations } from 'next-intl';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { getDeviceDescription } from '@/lib/device';

type CurrentDevice = {
  name: string | null;
  type: string | null;
  ipAddress: string | null;
  lastActiveAt: string;
} | null;

type DeviceConfirmDialogProps = {
  open: boolean;
  currentDevice: CurrentDevice;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
};

export function DeviceConfirmDialog({
  open,
  currentDevice,
  onConfirm,
  onCancel,
  isLoading,
}: DeviceConfirmDialogProps) {
  const t = useTranslations('auth.deviceConfirm');

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('title')}</AlertDialogTitle>
        </AlertDialogHeader>
        <div className="px-6 pb-6 text-sm text-muted-foreground">
          {currentDevice ? (
            <>
              <div className="mb-2">{t('description')}</div>
              <div className="rounded-md bg-muted p-3 text-sm">
                <div className="font-medium">
                  {getDeviceDescription(currentDevice.name, currentDevice.type)}
                </div>
                {currentDevice.ipAddress && (
                  <div className="mt-1 text-muted-foreground">
                    {t('ip')}: {currentDevice.ipAddress}
                  </div>
                )}
                {currentDevice.lastActiveAt && (
                  <div className="text-muted-foreground">
                    {t('lastActive')}: {new Date(currentDevice.lastActiveAt).toLocaleString()}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div>{t('noDevice')}</div>
          )}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} disabled={isLoading}>
            {t('cancel')}
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isLoading}>
            {isLoading ? t('loading') : t('confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
