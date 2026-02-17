import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DiscountCodeType, Prisma, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '@app/platform/database/prisma.service';
import { ActivateSubscriptionDto } from './dto/activate-subscription.dto';
import { UserSubscriptionDto } from './dto/subscription.dto';
import { PackageDto } from '@app/modules/packages/dto/package.dto';

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const clampPrice = (value: number) => Math.max(0, Number(value.toFixed(2)));

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listActivePackages() {
    const packages = await this.prisma.subscriptionPackage.findMany({
      where: { isActive: true },
      orderBy: [
        { durationDays: 'asc' },
        { includedUsers: 'asc' },
        { discountedPrice: 'asc' },
        { title: 'asc' },
      ],
    });
    return packages.map(PackageDto.fromEntity);
  }

  async getActiveSubscription(userId: string): Promise<UserSubscriptionDto | null> {
    if (!userId) {
      return null;
    }

    const now = new Date();
    const subscription = await this.prisma.userSubscription.findFirst({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
        endsAt: { gte: now },
      },
      orderBy: { endsAt: 'desc' },
      include: { package: true },
    });

    if (!subscription) {
      return null;
    }

    return UserSubscriptionDto.fromEntity(subscription);
  }

  async activateSubscription(
    userId: string,
    dto: ActivateSubscriptionDto,
  ): Promise<UserSubscriptionDto> {
    if (!userId) {
      throw new BadRequestException('Missing user.');
    }

    return this.prisma.$transaction(async (tx) => {
      const now = new Date();

      const pkg = await tx.subscriptionPackage.findUnique({ where: { id: dto.packageId } });
      if (!pkg || !pkg.isActive) {
        throw new NotFoundException('Subscription package not found.');
      }

      if (pkg.isTrial && pkg.trialOncePerUser) {
        const trialCount = await tx.userSubscription.count({
          where: { userId, isTrial: true },
        });
        if (trialCount > 0) {
          throw new BadRequestException('Trial already used.');
        }
      }

      const basePrice = pkg.discountedPrice.toNumber();
      let finalPrice = basePrice;

      let discountCodeId: string | null = null;
      if (dto.discountCode) {
        if (!pkg.allowDiscountCodes) {
          throw new BadRequestException('Discount codes are not allowed for this package.');
        }

        const codeValue = dto.discountCode.trim().toUpperCase();
        const discountCode = await tx.discountCode.findUnique({ where: { code: codeValue } });
        if (!discountCode || !discountCode.isActive) {
          throw new BadRequestException('Invalid discount code.');
        }

        if (discountCode.packageId && discountCode.packageId !== pkg.id) {
          throw new BadRequestException('Discount code is not valid for this package.');
        }

        if (discountCode.validFrom && now < discountCode.validFrom) {
          throw new BadRequestException('Discount code is not active yet.');
        }

        if (discountCode.validTo && now > discountCode.validTo) {
          throw new BadRequestException('Discount code has expired.');
        }

        if (discountCode.maxRedemptions) {
          const totalRedemptions = await tx.discountCodeRedemption.count({
            where: { discountCodeId: discountCode.id },
          });
          if (totalRedemptions >= discountCode.maxRedemptions) {
            throw new BadRequestException('Discount code has reached its limit.');
          }
        }

        if (discountCode.maxRedemptionsPerUser) {
          const userRedemptions = await tx.discountCodeRedemption.count({
            where: { discountCodeId: discountCode.id, userId },
          });
          if (userRedemptions >= discountCode.maxRedemptionsPerUser) {
            throw new BadRequestException('Discount code limit reached for this user.');
          }
        }

        const discountValue = discountCode.value.toNumber();
        if (discountCode.type === DiscountCodeType.PERCENT) {
          finalPrice = clampPrice(basePrice - basePrice * (discountValue / 100));
        } else {
          finalPrice = clampPrice(basePrice - discountValue);
        }

        discountCodeId = discountCode.id;
      }

      let inviteCodeId: string | null = null;
      let inviteBonusDays = 0;
      let inviterUserId: string | null = null;
      if (dto.inviteCode) {
        if (!pkg.allowInviteCodes) {
          throw new BadRequestException('Invite codes are not allowed for this package.');
        }

        const inviteValue = dto.inviteCode.trim().toUpperCase();
        const inviteCode = await tx.inviteCode.findUnique({ where: { code: inviteValue } });
        if (!inviteCode || !inviteCode.isActive) {
          throw new BadRequestException('Invalid invite code.');
        }

        if (inviteCode.inviterUserId === userId) {
          throw new BadRequestException('Invite code cannot be used by the inviter.');
        }

        const existingInvite = await tx.inviteCodeRedemption.findUnique({
          where: {
            inviteCodeId_invitedUserId: {
              inviteCodeId: inviteCode.id,
              invitedUserId: userId,
            },
          },
        });
        if (existingInvite) {
          throw new BadRequestException('Invite code already used by this user.');
        }

        const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
        const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
        const monthlyCount = await tx.inviteCodeRedemption.count({
          where: {
            inviteCode: { inviterUserId: inviteCode.inviterUserId },
            createdAt: { gte: monthStart, lt: nextMonthStart },
          },
        });
        if (monthlyCount >= inviteCode.monthlyInviteLimit) {
          throw new BadRequestException('Invite code monthly limit reached.');
        }

        inviteCodeId = inviteCode.id;
        inviteBonusDays = inviteCode.bonusDays;
        inviterUserId = inviteCode.inviterUserId;
      }

      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { pendingBonusDays: true },
      });
      const pendingBonusDays = user?.pendingBonusDays ?? 0;

      const totalBonusDays = pendingBonusDays;
      const totalDays = pkg.durationDays + pkg.freeDays + totalBonusDays;
      const endsAt = addDays(now, totalDays);

      const subscription = await tx.userSubscription.create({
        data: {
          userId,
          packageId: pkg.id,
          discountCodeId,
          inviteCodeId,
          status: SubscriptionStatus.ACTIVE,
          isTrial: pkg.isTrial,
          startsAt: now,
          endsAt,
          basePrice: new Prisma.Decimal(basePrice),
          finalPrice: new Prisma.Decimal(finalPrice),
          bonusDays: totalBonusDays,
        },
        include: { package: true },
      });

      if (pendingBonusDays > 0) {
        await tx.user.update({
          where: { id: userId },
          data: { pendingBonusDays: 0 },
        });
      }

      if (discountCodeId) {
        await tx.discountCodeRedemption.create({
          data: {
            discountCodeId,
            userId,
            subscriptionId: subscription.id,
          },
        });
      }

      if (inviteCodeId) {
        await tx.inviteCodeRedemption.create({
          data: {
            inviteCodeId,
            invitedUserId: userId,
            subscriptionId: subscription.id,
            bonusDaysApplied: inviteBonusDays,
          },
        });

        if (inviteBonusDays > 0 && inviterUserId) {
          const inviterSubscription = await tx.userSubscription.findFirst({
            where: {
              userId: inviterUserId,
              status: SubscriptionStatus.ACTIVE,
              endsAt: { gte: now },
            },
            orderBy: { endsAt: 'desc' },
          });

          if (inviterSubscription) {
            await tx.userSubscription.update({
              where: { id: inviterSubscription.id },
              data: {
                endsAt: addDays(inviterSubscription.endsAt, inviteBonusDays),
                bonusDays: inviterSubscription.bonusDays + inviteBonusDays,
              },
            });
          } else {
            await tx.user.update({
              where: { id: inviterUserId },
              data: { pendingBonusDays: { increment: inviteBonusDays } },
            });
          }
        }
      }

      return UserSubscriptionDto.fromEntity(subscription);
    });
  }
}
