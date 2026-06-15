'use client';

import type { JSX } from 'react';
import type { useTranslations } from 'next-intl';
import type { DivarPostContactInfo } from '@/types/divar-posts';
import { Button } from '@/components/ui/button';
import { Copy, Phone } from 'lucide-react';

type ContactInfoCardProps = {
  contactInfo: DivarPostContactInfo;
  t: ReturnType<typeof useTranslations>;
  onCopy: (info: DivarPostContactInfo) => void;
};

export function ContactInfoCard({ contactInfo, t, onCopy }: ContactInfoCardProps): JSX.Element {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/30 p-3 text-sm shadow-sm">
      <div className="flex flex-col gap-1">
        <p className="text-xs text-muted-foreground">{t('contactInfo.ownerLabel')}</p>
        <p className="text-sm font-semibold text-foreground">
          {contactInfo.ownerName ?? t('contactInfo.ownerUnknown')}
        </p>
      </div>
      <div className="mt-2 flex flex-col gap-1">
        <p className="text-xs text-muted-foreground">{t('contactInfo.phoneLabel')}</p>
        <p className="text-base font-semibold text-foreground ltr:font-mono rtl:font-sans">
          {contactInfo.phoneNumber ?? t('contactInfo.missingShort')}
        </p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!contactInfo.phoneNumber}
          className="flex items-center gap-2"
          onClick={() => {
            if (contactInfo.phoneNumber) {
              window.location.href = `tel:${contactInfo.phoneNumber}`;
            }
          }}
        >
          <Phone className="size-4" />
          <span>{t('contactInfo.call')}</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!contactInfo.phoneNumber}
          className="flex items-center gap-2"
          onClick={() => onCopy(contactInfo)}
        >
          <Copy className="size-4" />
          <span>{t('contactInfo.copy')}</span>
        </Button>
      </div>
    </div>
  );
}
