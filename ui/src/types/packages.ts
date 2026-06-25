export type PackageFeatureConfig = {
  id: string;
  featureKey: string;
  limitValue: number;
  allowExtra: boolean;
  maxExtra: number;
  extraUnitPrice: string | null;
  allowRollover: boolean;
  maxRolloverCap: number;
  unitPriceOverride: string | null;
};

export type PackagePriceSnapshot = {
  id: string;
  featureKey: string;
  pricingType: 'PER_UNIT' | 'FLAT_ACCESS';
  unitPrice: string;
  limitValue: number;
  dailyTotal: string;
  oneTimeTotal: string;
  isPermanent: boolean;
  extraUnitPrice: string | null;
  allowRollover: boolean;
  maxRolloverCap: number;
};

export type PackageStats = {
  subscriptionCounts: Record<string, number>;
  paymentCounts: Record<string, number>;
  totalRevenue: string;
};

export type SubscriptionPackage = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  durationDays: number;
  freeDays: number;
  includedUsers: number;
  isTrial: boolean;
  trialOncePerUser: boolean;
  actualPrice: string;
  discountedPrice: string;
  isActive: boolean;
  features: Record<string, string>;
  featureConfigs?: PackageFeatureConfig[];
  priceSnapshots?: PackagePriceSnapshot[];
  stats?: PackageStats;
  createdAt: string;
  updatedAt: string;
};

export type CreatePackagePayload = {
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  durationDays: number;
  freeDays: number;
  includedUsers: number;
  isTrial?: boolean;
  trialOncePerUser?: boolean;
  actualPrice: number;
  discountedPrice: number;
  isActive?: boolean;
  features?: Record<string, string>;
  featureConfigs?: Array<{
    featureKey: string;
    limitValue: number;
    allowExtra?: boolean;
    maxExtra?: number;
    unitPriceOverride?: number;
  }>;
};

export type UpdatePackagePayload = Partial<CreatePackagePayload>;
