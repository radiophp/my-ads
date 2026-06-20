'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { LoadingLogo } from '@/components/ui/loading-logo';
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
import type { ActiveDeviceInfo } from '@/features/api/endpoints/auth';

type DeviceSelectDialogProps = {
  open: boolean;
  activeDevices: ActiveDeviceInfo[];
  onConfirm: (deviceToReplace: string) => void;
  onCancel: () => void;
  isLoading: boolean;
};

export function DeviceSelectDialog({
  open,
  activeDevices,
  onConfirm,
  onCancel,
  isLoading,
}: DeviceSelectDialogProps) {
  const t = useTranslations('auth.deviceConfirm');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('title')}</AlertDialogTitle>
        </AlertDialogHeader>
        <div className="px-6 pb-6 text-sm text-muted-foreground">
          <div className="mb-3">{t('selectDevice')}</div>
          <div className="space-y-2">
            {activeDevices.map((device) => (
              <button
                key={device.deviceId}
                type="button"
                className={`w-full rounded-md border p-3 text-right text-sm transition ${
                  selectedDeviceId === device.deviceId
                    ? 'border-primary bg-primary/10'
                    : 'border-border/60 hover:border-border'
                }`}
                onClick={() => setSelectedDeviceId(device.deviceId)}
              >
                <div className="font-medium">
                  {getDeviceDescription(device.name, device.type)}
                </div>
                {device.ipAddress && (
                  <div className="mt-1 text-muted-foreground">
                    {t('ip')}: {device.ipAddress}
                  </div>
                )}
                <div className="text-muted-foreground">
                  {t('lastActive')}: {new Date(device.lastActiveAt).toLocaleString()}
                </div>
              </button>
            ))}
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} disabled={isLoading}>
            {t('cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (selectedDeviceId) onConfirm(selectedDeviceId);
            }}
            disabled={isLoading || !selectedDeviceId}
          >
            {isLoading ? (
              <span className="inline-flex items-center gap-2">
                <LoadingLogo size="sm" />
                {t('loading')}
              </span>
            ) : (
              t('replace')
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
