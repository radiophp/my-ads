export type FeatureBasePrice = {
  id: string;
  featureKey: string;
  title: string;
  titleEn: string;
  pricingType: 'PER_UNIT' | 'FLAT_ACCESS';
  unitPrice: string;
  unitLabel: string | null;
  limitType: string;
  isPermanent: boolean;
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
  isPermanent?: boolean;
  isActive?: boolean;
  sortOrder?: number;
};

export type UpdateFeatureBasePricePayload = Partial<CreateFeatureBasePricePayload>;

export type PackagePricingBreakdown = {
  subscriptionDailyTotal: string;
  subscriptionTotalForDuration: string;
  oneTimeTotal: string;
  grandTotal: string;
  features: Array<{
    featureKey: string;
    pricingType: 'PER_UNIT' | 'FLAT_ACCESS';
    unitPrice: string;
    limitValue: number;
    limitType: string;
    dailyTotal: string;
    oneTimeTotal: string;
    isPermanent: boolean;
  }>;
};

export type CalculatePricingPayload = {
  durationDays: number;
  featureConfigs: Array<{ featureKey: string; limitValue: number }>;
};
