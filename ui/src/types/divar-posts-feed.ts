import type { LucideIcon } from 'lucide-react';

export type AmenityKey = 'hasParking' | 'hasElevator' | 'hasWarehouse' | 'hasBalcony';

export type AmenityConfig = {
  key: AmenityKey;
  icon: LucideIcon;
  labelKey: string;
};

export type DetailEntry = {
  id: string;
  labelKey: string;
  label: string;
  value: string | null;
};
