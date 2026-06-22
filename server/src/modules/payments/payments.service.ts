import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DiscountCodeType, Prisma, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '@app/platform/database/prisma.service';

const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const clampPrice = (value: number) => Math.max(0, Number(value.toFixed(2)));

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async initiate(
    userId: string,
    dto: { packageId: string; discountCode?: string; inviteCode?: string },
  ) {
    const pkg = await this.prisma.subscriptionPackage.findUnique({ where: { id: dto.packageId } });
    if (!pkg || !pkg.isActive) {
      throw new NotFoundException('Subscription package not found.');
    }

    const price = pkg.discountedPrice.toNumber();
    if (price <= 0) {
      throw new BadRequestException('This package is free. Use the direct activation flow.');
    }

    let finalPrice = price;
    let discountCodeId: string | null = null;

    if (dto.discountCode) {
      const codeValue = dto.discountCode.trim().toUpperCase();
      const discountCode = await this.prisma.discountCode.findUnique({
        where: { code: codeValue },
      });
      if (!discountCode || !discountCode.isActive) {
        throw new BadRequestException('Invalid discount code.');
      }
      if (discountCode.packageId && discountCode.packageId !== pkg.id) {
        throw new BadRequestException('Discount code is not valid for this package.');
      }
      const now = new Date();
      if (discountCode.validFrom && now < discountCode.validFrom) {
        throw new BadRequestException('Discount code is not active yet.');
      }
      if (discountCode.validTo && now > discountCode.validTo) {
        throw new BadRequestException('Discount code has expired.');
      }
      if (discountCode.maxRedemptions) {
        const totalRedemptions = await this.prisma.discountCodeRedemption.count({
          where: { discountCodeId: discountCode.id },
        });
        if (totalRedemptions >= discountCode.maxRedemptions) {
          throw new BadRequestException('Discount code has reached its limit.');
        }
      }
      if (discountCode.maxRedemptionsPerUser) {
        const userRedemptions = await this.prisma.discountCodeRedemption.count({
          where: { discountCodeId: discountCode.id, userId },
        });
        if (userRedemptions >= discountCode.maxRedemptionsPerUser) {
          throw new BadRequestException('Discount code limit reached for this user.');
        }
      }

      const discountValue = discountCode.value.toNumber();
      if (discountCode.type === DiscountCodeType.PERCENT) {
        finalPrice = clampPrice(price - price * (discountValue / 100));
      } else {
        finalPrice = clampPrice(price - discountValue);
      }
      discountCodeId = discountCode.id;
    }

    let inviteCodeId: string | null = null;
    if (dto.inviteCode) {
      const inviteValue = dto.inviteCode.trim().toUpperCase();
      const inviteCode = await this.prisma.inviteCode.findUnique({ where: { code: inviteValue } });
      if (!inviteCode || !inviteCode.isActive) {
        throw new BadRequestException('Invalid invite code.');
      }
      if (inviteCode.inviterUserId === userId) {
        throw new BadRequestException('Invite code cannot be used by the inviter.');
      }
      const existingInvite = await this.prisma.inviteCodeRedemption.findUnique({
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
      inviteCodeId = inviteCode.id;
    }

    const payment = await this.prisma.paymentRequest.create({
      data: {
        userId,
        packageId: pkg.id,
        amount: finalPrice,
        discountCodeId,
        inviteCodeId,
      },
    });

    return payment;
  }

  async uploadReceipt(paymentId: string, userId: string, receiptUrl: string) {
    const payment = await this.prisma.paymentRequest.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found.');
    if (payment.userId !== userId)
      throw new BadRequestException('Payment does not belong to user.');
    if (payment.status === 'APPROVED') throw new BadRequestException('Payment already approved.');
    if (payment.status === 'PENDING' && payment.receiptUrl) {
      throw new BadRequestException('Receipt already uploaded. Wait for admin review.');
    }

    return this.prisma.paymentRequest.update({
      where: { id: paymentId },
      data: { receiptUrl, status: 'PENDING', rejectionReason: null },
    });
  }

  async reUploadReceipt(paymentId: string, userId: string, receiptUrl: string) {
    const payment = await this.prisma.paymentRequest.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found.');
    if (payment.userId !== userId)
      throw new BadRequestException('Payment does not belong to user.');
    if (payment.status !== 'REJECTED') throw new BadRequestException('Payment is not rejected.');
    if (payment.receiptUrl === receiptUrl) {
      throw new BadRequestException('Please upload a different receipt file.');
    }

    return this.prisma.paymentRequest.update({
      where: { id: paymentId },
      data: { receiptUrl, status: 'PENDING', rejectionReason: null },
    });
  }

  async getUserPayments(userId: string, page = 1, limit = 20) {
    const where = { userId };
    const [total, items] = await Promise.all([
      this.prisma.paymentRequest.count({ where }),
      this.prisma.paymentRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          package: { select: { id: true, title: true, imageUrl: true } },
        },
      }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getPayment(paymentId: string, userId: string) {
    const payment = await this.prisma.paymentRequest.findUnique({
      where: { id: paymentId },
      include: {
        package: { select: { id: true, title: true, imageUrl: true, durationDays: true } },
      },
    });
    if (!payment) throw new NotFoundException('Payment not found.');
    if (payment.userId !== userId)
      throw new BadRequestException('Payment does not belong to user.');
    return payment;
  }

  async adminListPayments(params: { status?: string; page?: number; limit?: number }) {
    const { status, page = 1, limit = 20 } = params;
    const where: Prisma.PaymentRequestWhereInput = {};
    if (status) where.status = status as any;

    const [total, items] = await Promise.all([
      this.prisma.paymentRequest.count({ where }),
      this.prisma.paymentRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, phone: true, firstName: true, lastName: true } },
          package: { select: { id: true, title: true } },
        },
      }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async approvePayment(paymentId: string, adminId: string) {
    const payment = await this.prisma.paymentRequest.findUnique({
      where: { id: paymentId },
      include: { package: true },
    });
    if (!payment) throw new NotFoundException('Payment not found.');
    if (payment.status !== 'PENDING') {
      throw new BadRequestException('Payment is not pending.');
    }
    if (!payment.receiptUrl) {
      throw new BadRequestException('Payment has no receipt uploaded.');
    }

    const now = new Date();
    const pkg = payment.package;
    const user = await this.prisma.user.findUnique({
      where: { id: payment.userId },
      select: { pendingBonusDays: true },
    });

    const pendingBonusDays = user?.pendingBonusDays ?? 0;
    const totalDays = pkg.durationDays + pkg.freeDays + pendingBonusDays;
    const endsAt = addDays(now, totalDays);

    const subscription = await this.prisma.userSubscription.create({
      data: {
        userId: payment.userId,
        packageId: pkg.id,
        discountCodeId: payment.discountCodeId,
        inviteCodeId: payment.inviteCodeId,
        status: SubscriptionStatus.ACTIVE,
        startsAt: now,
        endsAt,
        basePrice: pkg.actualPrice,
        finalPrice: new Prisma.Decimal(payment.amount),
        bonusDays: pendingBonusDays,
      },
    });

    await this.prisma.paymentRequest.update({
      where: { id: paymentId },
      data: { status: 'APPROVED', reviewedBy: adminId, reviewedAt: now },
    });

    if (pendingBonusDays > 0) {
      await this.prisma.user.update({
        where: { id: payment.userId },
        data: { pendingBonusDays: 0 },
      });
    }

    if (payment.discountCodeId) {
      await this.prisma.discountCodeRedemption.create({
        data: {
          discountCodeId: payment.discountCodeId,
          userId: payment.userId,
          subscriptionId: subscription.id,
        },
      });
    }

    if (payment.inviteCodeId) {
      const invite = await this.prisma.inviteCode.findUnique({
        where: { id: payment.inviteCodeId },
      });
      if (invite) {
        await this.prisma.inviteCodeRedemption.create({
          data: {
            inviteCodeId: payment.inviteCodeId,
            invitedUserId: payment.userId,
            subscriptionId: subscription.id,
            bonusDaysApplied: invite.bonusDays,
          },
        });

        if (invite.bonusDays > 0) {
          const inviterSubscription = await this.prisma.userSubscription.findFirst({
            where: {
              userId: invite.inviterUserId,
              status: SubscriptionStatus.ACTIVE,
              endsAt: { gte: now },
            },
            orderBy: { endsAt: 'desc' },
          });

          if (inviterSubscription) {
            await this.prisma.userSubscription.update({
              where: { id: inviterSubscription.id },
              data: {
                endsAt: addDays(inviterSubscription.endsAt, invite.bonusDays),
                bonusDays: inviterSubscription.bonusDays + invite.bonusDays,
              },
            });
          } else {
            await this.prisma.user.update({
              where: { id: invite.inviterUserId },
              data: { pendingBonusDays: { increment: invite.bonusDays } },
            });
          }
        }
      }
    }

    return { status: 'APPROVED', message: 'Payment approved and subscription activated.' };
  }

  async rejectPayment(paymentId: string, reason?: string) {
    const payment = await this.prisma.paymentRequest.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found.');
    if (payment.status !== 'PENDING') {
      throw new BadRequestException('Payment is not pending.');
    }

    return this.prisma.paymentRequest.update({
      where: { id: paymentId },
      data: { status: 'REJECTED', rejectionReason: reason ?? null, reviewedAt: new Date() },
    });
  }

  async getReceiptUploadUrl(userId: string, paymentId: string): Promise<string> {
    const payment = await this.prisma.paymentRequest.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found.');
    if (payment.userId !== userId) throw new BadRequestException('Not your payment.');
    return payment.receiptUrl ?? '';
  }
}
