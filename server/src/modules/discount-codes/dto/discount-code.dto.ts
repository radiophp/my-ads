import type { DiscountCode } from '@prisma/client';

export class DiscountCodeDto {
  id!: string;
  code!: string;
  description!: string | null;
  type!: DiscountCode['type'];
  value!: string;
  maxRedemptions!: number | null;
  maxRedemptionsPerUser!: number | null;
  validFrom!: Date | null;
  validTo!: Date | null;
  isActive!: boolean;
  packageId!: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  static fromEntity(entity: DiscountCode): DiscountCodeDto {
    return {
      id: entity.id,
      code: entity.code,
      description: entity.description ?? null,
      type: entity.type,
      value: entity.value.toString(),
      maxRedemptions: entity.maxRedemptions ?? null,
      maxRedemptionsPerUser: entity.maxRedemptionsPerUser ?? null,
      validFrom: entity.validFrom ?? null,
      validTo: entity.validTo ?? null,
      isActive: entity.isActive,
      packageId: entity.packageId ?? null,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
