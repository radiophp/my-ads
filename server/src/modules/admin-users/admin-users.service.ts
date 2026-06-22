import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ActivationStatus, Prisma, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '@app/platform/database/prisma.service';
import { SubscriptionsService } from '@app/modules/subscriptions/subscriptions.service';
import { BaleBotService } from '@app/modules/bale/bale.service';
import { ReviewActivationDto } from '@app/modules/subscriptions/dto/review-activation.dto';

type ListUsersParams = {
  page: number;
  limit: number;
  search?: string;
  activationStatus?: string;
};

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly baleBotService: BaleBotService,
  ) {}

  async listUsers({ page, limit, search, activationStatus }: ListUsersParams) {
    const where: Prisma.UserWhereInput = {};

    if (search) {
      const term = search.trim();
      where.OR = [
        { phone: { contains: term } },
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
      ];
    }

    if (activationStatus) {
      where.activationStatus = activationStatus as ActivationStatus;
    }

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          subscriptions: {
            where: { status: SubscriptionStatus.ACTIVE, endsAt: { gte: new Date() } },
            orderBy: { endsAt: 'desc' },
            take: 1,
            include: { package: { select: { id: true, title: true } } },
          },
          city: { select: { id: true, name: true, province: { select: { name: true } } } },
        },
      }),
    ]);

    const items = users.map((u) => ({
      id: u.id,
      phone: u.phone,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      isActive: u.isActive,
      activationStatus: u.activationStatus,
      activationNote: u.activationNote,
      activationRequestedAt: u.activationRequestedAt,
      createdAt: u.createdAt,
      city: u.city ? { id: u.city.id, name: u.city.name, province: u.city.province.name } : null,
      currentSubscription: u.subscriptions[0]
        ? {
            id: u.subscriptions[0].id,
            packageTitle: u.subscriptions[0].package.title,
            endsAt: u.subscriptions[0].endsAt,
          }
        : null,
    }));

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          include: { package: { select: { id: true, title: true } } },
        },
        city: { select: { id: true, name: true, province: { select: { name: true } } } },
      },
    });
    if (!user) throw new NotFoundException('User not found.');

    const { hashedRefreshToken: _hashedRefreshToken, ...safe } = user;
    return safe;
  }

  async approveActivation(userId: string, _adminId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');
    if (user.activationStatus !== ActivationStatus.PENDING) {
      throw new BadRequestException('User is not pending activation.');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        activationStatus: ActivationStatus.APPROVED,
        activationNote: null,
      },
    });

    await this.baleBotService.sendActivationApproved(userId);

    return { status: 'APPROVED', message: 'User activation approved.' };
  }

  async rejectActivation(userId: string, dto: ReviewActivationDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found.');
    if (user.activationStatus !== ActivationStatus.PENDING) {
      throw new BadRequestException('User is not pending activation.');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        activationStatus: ActivationStatus.REJECTED,
        activationNote: dto.note ?? null,
      },
    });

    return { status: 'REJECTED', message: 'User activation rejected.' };
  }
}
