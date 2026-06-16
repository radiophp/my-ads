'use client';

import { useTranslations } from 'next-intl';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
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
          <AlertDialogDescription>
            {currentDevice ? (
              <>
                <div className="mb-2">{t('description')}</div>
                <div className="rounded-md bg-muted p-3 text-sm">
                  <p className="font-medium">
                    {getDeviceDescription(currentDevice.name, currentDevice.type)}
                  </p>
                  {currentDevice.ipAddress && (
                    <p className="mt-1 text-muted-foreground">
                      {t('ip')}: {currentDevice.ipAddress}
                    </p>
                  )}
                  {currentDevice.lastActiveAt && (
                    <p className="text-muted-foreground">
                      {t('lastActive')}: {new Date(currentDevice.lastActiveAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <p>{t('noDevice')}</p>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
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
