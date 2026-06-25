import type {
  SubscriptionPackage,
  PackageFeatureConfig,
  PackageFeaturePriceSnapshot,
} from '@prisma/client';

export interface PackageStats {
  subscriptionCounts: Record<string, number>;
  paymentCounts: Record<string, number>;
  totalRevenue: string;
}

export class PackageDto {
  id!: string;
  title!: string;
  description!: string | null;
  imageUrl!: string | null;
  durationDays!: number;
  freeDays!: number;
  includedUsers!: number;
  isTrial!: boolean;
  trialOncePerUser!: boolean;
  actualPrice!: string;
  discountedPrice!: string;
  isActive!: boolean;
  features!: Record<string, string>;
  featureConfigs?: unknown[];
  priceSnapshots?: unknown[];
  stats?: PackageStats;
  createdAt!: Date;
  updatedAt!: Date;

  static fromEntity(
    entity: SubscriptionPackage & {
      featureConfigs?: PackageFeatureConfig[];
      priceSnapshots?: PackageFeaturePriceSnapshot[];
    },
    stats?: PackageStats,
  ): PackageDto {
    return {
      id: entity.id,
      title: entity.title,
      description: entity.description ?? null,
      imageUrl: entity.imageUrl ?? null,
      durationDays: entity.durationDays,
      freeDays: entity.freeDays,
      includedUsers: entity.includedUsers,
      isTrial: entity.isTrial,
      trialOncePerUser: entity.trialOncePerUser,
      actualPrice: entity.actualPrice.toString(),
      discountedPrice: entity.discountedPrice.toString(),
      isActive: entity.isActive,
      features: Object.fromEntries(
        Object.entries((entity.features as Record<string, unknown>) ?? {}).map(([k, v]) => [
          k,
          v != null ? String(v) : '',
        ]),
      ),
      featureConfigs: entity.featureConfigs ?? undefined,
      priceSnapshots: entity.priceSnapshots ?? undefined,
      stats,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
