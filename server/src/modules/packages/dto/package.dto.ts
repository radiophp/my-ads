import type { SubscriptionPackage } from '@prisma/client';

export class PackageDto {
  id!: string;
  title!: string;
  description!: string | null;
  imageUrl!: string | null;
  durationDays!: number;
  freeDays!: number;
  includedUsers!: number;
  savedFiltersLimit!: number;
  actualPrice!: string;
  discountedPrice!: string;
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;

  static fromEntity(entity: SubscriptionPackage): PackageDto {
    return {
      id: entity.id,
      title: entity.title,
      description: entity.description ?? null,
      imageUrl: entity.imageUrl ?? null,
      durationDays: entity.durationDays,
      freeDays: entity.freeDays,
      includedUsers: entity.includedUsers,
      savedFiltersLimit: entity.savedFiltersLimit,
      actualPrice: entity.actualPrice.toString(),
      discountedPrice: entity.discountedPrice.toString(),
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
