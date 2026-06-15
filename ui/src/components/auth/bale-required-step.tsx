'use client';

import { useTranslations } from 'next-intl';
import { Copy, ExternalLink } from 'lucide-react';

import { Button } from '@/components/ui/button';

type BaleRequiredStepProps = {
  baleBotUrl: string | null;
  baleLinkToken: string | null;
  isMobile: boolean;
  hasInteractedWithBot: boolean;
  countdown: number;
  isBaleLoggingIn: boolean;
  onOpenBot: () => void;
  onCopyBotUrl: () => void;
  onBaleLogin: () => void;
};

export function BaleRequiredStep({
  baleBotUrl,
  baleLinkToken,
  isMobile,
  hasInteractedWithBot,
  countdown,
  isBaleLoggingIn,
  onOpenBot,
  onCopyBotUrl,
  onBaleLogin,
}: BaleRequiredStepProps) {
  const t = useTranslations('landing.login');

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-medium">{t('baleRequired')}</p>
        <p className="mt-1 text-amber-700">{t('baleRequiredDescription')}</p>
      </div>
      {baleBotUrl && (
        <>
          {!isMobile && (
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/auth/bale-qr?start=signup${baleLinkToken ? `&token=${baleLinkToken}` : ''}`}
                alt="QR Code"
                className="size-48 rounded-lg border"
                crossOrigin="anonymous"
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button
              className="flex-1"
              variant="outline"
              onClick={onOpenBot}
            >
              <span className="inline-flex items-center gap-2">
                <ExternalLink className="size-4" aria-hidden />
                {t('openBaleBot')}
              </span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 text-xs text-muted-foreground"
              onClick={onCopyBotUrl}
            >
              <span className="inline-flex items-center gap-2">
                <Copy className="size-3" aria-hidden />
                {t('copyBotUrl')}
              </span>
            </Button>
          </div>
        </>
      )}
      {hasInteractedWithBot && (
        <Button
          className="w-full"
          onClick={onBaleLogin}
          disabled={countdown > 0 || isBaleLoggingIn}
        >
          {isBaleLoggingIn
            ? t('verifying')
            : countdown > 0
              ? `${t('joinedBale')} (${countdown})`
              : t('joinedBale')}
        </Button>
      )}
    </div>
  );
}
