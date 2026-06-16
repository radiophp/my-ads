'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Smartphone, Monitor, Tablet, Laptop, Trash2 } from 'lucide-react';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { useGetDevicesQuery, useDeleteDeviceMutation } from '@/features/api/endpoints/auth';
import { getDeviceDescription } from '@/lib/device';

function DeviceIcon({ type }: { type: string | null }) {
  switch (type) {
    case 'mobile':
      return <Smartphone className="size-5" />;
    case 'tablet':
      return <Tablet className="size-5" />;
    case 'desktop':
      return <Monitor className="size-5" />;
    default:
      return <Laptop className="size-5" />;
  }
}

function SessionsContent() {
  const t = useTranslations('auth.sessions');
  const { toast } = useToast();

  const { data: devices = [], isLoading, error } = useGetDevicesQuery();
  const [deleteDevice, { isLoading: isDeleting }] = useDeleteDeviceMutation();

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (deviceId: string) => {
    setDeletingId(deviceId);
    try {
      await deleteDevice(deviceId).unwrap();
      toast({ title: t('deleted') });
    } catch {
      toast({ title: t('deleteError'), variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-md bg-muted"
              />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{t('loadError')}</p>
        ) : devices.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('empty')}</p>
        ) : (
          <div className="space-y-3">
            {devices.map((device) => {
              const isCurrentDevice = device.isActive;

              return (
                <div
                  key={device.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="flex items-center gap-3">
                    <DeviceIcon type={device.type} />
                    <div>
                      <p className="text-sm font-medium">
                        {getDeviceDescription(device.name, device.type)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {device.ipAddress && `${device.ipAddress} · `}
                        {t('lastActive')}: {new Date(device.lastActiveAt).toLocaleString()}
                      </p>
                      {isCurrentDevice && (
                        <span className="mt-0.5 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          {t('current')}
                        </span>
                      )}
                    </div>
                  </div>
                  {!isCurrentDevice && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(device.deviceId)}
                      disabled={isDeleting && deletingId === device.deviceId}
                      aria-label={t('remove')}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function SessionPageClient() {
  return (
    <AuthGuard>
      <div className="mx-auto max-w-2xl p-4 sm:p-6">
        <SessionsContent />
      </div>
    </AuthGuard>
  );
}
