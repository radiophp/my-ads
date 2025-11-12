import type { JSX } from 'react';
import { Store, UserRound } from 'lucide-react';
import type { useTranslations } from 'next-intl';

export type BusinessBadge = {
  label: string;
  className: string;
  icon?: JSX.Element;
} | null;

export function getBusinessTypeBadge(
  value: string | null,
  t: ReturnType<typeof useTranslations>,
): BusinessBadge {
  if (!value) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  const realtorValues = new Set(['real-estate-business', 'real-estate', 'premium-panel']);
  if (realtorValues.has(normalized)) {
    return {
      label: t('businessType.realEstateBusiness'),
      className: 'bg-black/70',
      icon: <Store className="size-3.5" aria-hidden />,
    };
  }
  if (normalized === 'personal') {
    return {
      label: t('businessType.personal'),
      className: 'bg-black/70',
      icon: <UserRound className="size-3.5" aria-hidden />,
    };
  }
  return null;
}
