import type {
  SubscriptionPackage,
  PackageFeatureConfig,
  PackageFeaturePriceSnapshot,
} from '@prisma/client';

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
  createdAt!: Date;
  updatedAt!: Date;

  static fromEntity(
    entity: SubscriptionPackage & {
      featureConfigs?: PackageFeatureConfig[];
      priceSnapshots?: PackageFeaturePriceSnapshot[];
    },
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
      features: (entity.features as Record<string, string>) ?? {},
      featureConfigs: entity.featureConfigs ?? undefined,
      priceSnapshots: entity.priceSnapshots ?? undefined,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
