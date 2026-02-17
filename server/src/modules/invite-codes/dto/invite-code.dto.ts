import type { InviteCode } from '@prisma/client';

export class InviteCodeDto {
  id!: string;
  code!: string;
  inviterUserId!: string;
  bonusDays!: number;
  monthlyInviteLimit!: number;
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;

  static fromEntity(entity: InviteCode): InviteCodeDto {
    return {
      id: entity.id,
      code: entity.code,
      inviterUserId: entity.inviterUserId,
      bonusDays: entity.bonusDays,
      monthlyInviteLimit: entity.monthlyInviteLimit,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
