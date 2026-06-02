import type { SubscriptionPackage, UserSubscription } from '@prisma/client';

export type SubscriptionPackageSummary = Pick<
  SubscriptionPackage,
  | 'id'
  | 'title'
  | 'durationDays'
  | 'freeDays'
  | 'includedUsers'
  | 'savedFiltersLimit'
  | 'isTrial'
  | 'trialOncePerUser'
  | 'allowDiscountCodes'
  | 'allowInviteCodes'
>;

export class UserSubscriptionDto {
  id!: string;
  packageId!: string;
  discountCodeId!: string | null;
  inviteCodeId!: string | null;
  status!: UserSubscription['status'];
  isTrial!: boolean;
  startsAt!: Date;
  endsAt!: Date;
  basePrice!: string;
  finalPrice!: string;
  bonusDays!: number;
  createdAt!: Date;
  updatedAt!: Date;
  package?: SubscriptionPackageSummary;

  static fromEntity(
    entity: UserSubscription & { package?: SubscriptionPackage | null },
  ): UserSubscriptionDto {
    return {
      id: entity.id,
      packageId: entity.packageId,
      discountCodeId: entity.discountCodeId ?? null,
      inviteCodeId: entity.inviteCodeId ?? null,
      status: entity.status,
      isTrial: entity.isTrial,
      startsAt: entity.startsAt,
      endsAt: entity.endsAt,
      basePrice: entity.basePrice.toString(),
      finalPrice: entity.finalPrice.toString(),
      bonusDays: entity.bonusDays,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      package: entity.package
        ? {
            id: entity.package.id,
            title: entity.package.title,
            durationDays: entity.package.durationDays,
            freeDays: entity.package.freeDays,
            includedUsers: entity.package.includedUsers,
            savedFiltersLimit: entity.package.savedFiltersLimit,
            isTrial: entity.package.isTrial,
            trialOncePerUser: entity.package.trialOncePerUser,
            allowDiscountCodes: entity.package.allowDiscountCodes,
            allowInviteCodes: entity.package.allowInviteCodes,
          }
        : undefined,
    };
  }
}
