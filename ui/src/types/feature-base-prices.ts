export type FeatureBasePrice = {
  id: string;
  featureKey: string;
  title: string;
  titleEn: string;
  pricingType: 'PER_UNIT' | 'FLAT_ACCESS';
  unitPrice: string;
  unitLabel: string | null;
  limitType: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateFeatureBasePricePayload = {
  featureKey: string;
  title: string;
  titleEn: string;
  pricingType: 'PER_UNIT' | 'FLAT_ACCESS';
  unitPrice: number;
  unitLabel?: string;
  isActive?: boolean;
  sortOrder?: number;
};

export type UpdateFeatureBasePricePayload = Partial<CreateFeatureBasePricePayload>;

export type PackagePricingBreakdown = {
  dailyTotal: string;
  totalForDuration: string;
  features: Array<{
    featureKey: string;
    pricingType: 'PER_UNIT' | 'FLAT_ACCESS';
    unitPrice: string;
    limitValue: number;
    dailyTotal: string;
  }>;
};
