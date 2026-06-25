import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@app/platform/database/prisma.service';

@Injectable()
export class UserFeatureOverrideService {
  constructor(private readonly prisma: PrismaService) {}

  async listByUser(userId: string) {
    return this.prisma.userFeatureOverride.findMany({
      where: { userId },
      orderBy: { featureKey: 'asc' },
    });
  }

  async upsert(userId: string, featureKey: string, limitValue: number) {
    return this.prisma.userFeatureOverride.upsert({
      where: { userId_featureKey: { userId, featureKey } },
      update: { limitValue },
      create: { userId, featureKey, limitValue },
    });
  }

  async remove(userId: string, featureKey: string) {
    const existing = await this.prisma.userFeatureOverride.findUnique({
      where: { userId_featureKey: { userId, featureKey } },
    });
    if (!existing) throw new NotFoundException('Override not found.');
    await this.prisma.userFeatureOverride.delete({ where: { id: existing.id } });
  }
}
