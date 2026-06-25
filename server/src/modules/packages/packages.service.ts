import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@app/platform/database/prisma.service';
import { PackageDto } from './dto/package.dto';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';
import { FeaturePricingService } from './feature-pricing.service';

@Injectable()
export class PackagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly featurePricingService: FeaturePricingService,
  ) {}

  async list(): Promise<PackageDto[]> {
    const packages = await this.prisma.subscriptionPackage.findMany({
      orderBy: [
        { durationDays: 'asc' },
        { includedUsers: 'asc' },
        { discountedPrice: 'asc' },
        { title: 'asc' },
      ],
      include: {
        featureConfigs: true,
        priceSnapshots: true,
      },
    });

    if (packages.length === 0) return [];

    const packageIds = packages.map((p) => p.id);

    const [subscriptionGroups, paymentGroups] = await Promise.all([
      this.prisma.userSubscription.groupBy({
        by: ['packageId', 'status'],
        _count: true,
        where: { packageId: { in: packageIds } },
      }),
      this.prisma.paymentRequest.groupBy({
        by: ['packageId', 'status'],
        _count: true,
        _sum: { finalAmount: true },
        where: { packageId: { in: packageIds } },
      }),
    ]);

    const subMap: Record<string, Record<string, number>> = {};
    for (const g of subscriptionGroups) {
      if (!subMap[g.packageId]) subMap[g.packageId] = {};
      subMap[g.packageId][g.status] = g._count;
    }

    const payMap: Record<string, { counts: Record<string, number>; revenue: number }> = {};
    for (const g of paymentGroups) {
      if (!payMap[g.packageId]) payMap[g.packageId] = { counts: {}, revenue: 0 };
      payMap[g.packageId].counts[g.status] = g._count;
      if (g.status === 'APPROVED' && g._sum.finalAmount) {
        payMap[g.packageId].revenue += g._sum.finalAmount.toNumber();
      }
    }

    return packages.map((p) => {
      const sub = subMap[p.id] ?? {};
      const pay = payMap[p.id] ?? { counts: {}, revenue: 0 };
      return PackageDto.fromEntity(p, {
        subscriptionCounts: {
          ACTIVE: sub['ACTIVE'] ?? 0,
          EXPIRED: sub['EXPIRED'] ?? 0,
          CANCELED: sub['CANCELED'] ?? 0,
        },
        paymentCounts: {
          INITIATED: pay.counts['INITIATED'] ?? 0,
          PENDING: pay.counts['PENDING'] ?? 0,
          APPROVED: pay.counts['APPROVED'] ?? 0,
          REJECTED: pay.counts['REJECTED'] ?? 0,
          CANCELLED: pay.counts['CANCELLED'] ?? 0,
        },
        totalRevenue: pay.revenue.toString(),
      });
    });
  }

  async findById(id: string): Promise<PackageDto> {
    const entity = await this.prisma.subscriptionPackage.findUnique({
      where: { id },
      include: {
        featureConfigs: true,
        priceSnapshots: true,
      },
    });
    if (!entity) {
      throw new NotFoundException('Subscription package not found.');
    }
    return PackageDto.fromEntity(entity);
  }

  async create(dto: CreatePackageDto): Promise<PackageDto> {
    if (dto.discountedPrice > dto.actualPrice) {
      throw new BadRequestException('Discounted price cannot exceed actual price.');
    }

    const entity = await this.prisma.subscriptionPackage.create({
      data: {
        title: dto.title,
        description: dto.description ?? null,
        imageUrl: dto.imageUrl ?? null,
        durationDays: dto.durationDays,
        freeDays: dto.freeDays,
        includedUsers: dto.includedUsers,
        isTrial: dto.isTrial ?? false,
        trialOncePerUser: dto.trialOncePerUser ?? true,
        actualPrice: new Prisma.Decimal(dto.actualPrice),
        discountedPrice: new Prisma.Decimal(dto.discountedPrice),
        isActive: dto.isActive ?? true,
        features: (dto.features ?? {}) as Prisma.JsonObject,
        featureConfigs: dto.featureConfigs
          ? {
              create: dto.featureConfigs.map((fc) => ({
                featureKey: fc.featureKey,
                limitValue: fc.limitValue,
                allowExtra: fc.allowExtra ?? false,
                maxExtra: fc.maxExtra ?? 0,
                extraUnitPrice: fc.extraUnitPrice ?? null,
                allowRollover: fc.allowRollover ?? false,
                maxRolloverCap: fc.maxRolloverCap ?? 0,
                unitPriceOverride: fc.unitPriceOverride ?? null,
              })),
            }
          : undefined,
      },
      include: {
        featureConfigs: true,
        priceSnapshots: true,
      },
    });

    if (dto.featureConfigs) {
      await this.featurePricingService.generateSnapshots(entity.id);
    }

    return PackageDto.fromEntity(entity);
  }

  async update(id: string, dto: UpdatePackageDto): Promise<PackageDto> {
    const existing = await this.prisma.subscriptionPackage.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Subscription package not found.');
    }

    let nextActualPrice = existing.actualPrice.toNumber();
    if (typeof dto.actualPrice === 'number') {
      nextActualPrice = dto.actualPrice;
    }

    let nextDiscountedPrice = existing.discountedPrice.toNumber();
    if (typeof dto.discountedPrice === 'number') {
      nextDiscountedPrice = dto.discountedPrice;
    }

    if (nextDiscountedPrice > nextActualPrice) {
      throw new BadRequestException('Discounted price cannot exceed actual price.');
    }

    const entity = await this.prisma.subscriptionPackage.update({
      where: { id },
      data: {
        ...(typeof dto.title === 'string' ? { title: dto.title } : {}),
        ...(typeof dto.description !== 'undefined' ? { description: dto.description } : {}),
        ...(typeof dto.imageUrl !== 'undefined' ? { imageUrl: dto.imageUrl } : {}),
        ...(typeof dto.durationDays === 'number' ? { durationDays: dto.durationDays } : {}),
        ...(typeof dto.freeDays === 'number' ? { freeDays: dto.freeDays } : {}),
        ...(typeof dto.includedUsers === 'number' ? { includedUsers: dto.includedUsers } : {}),
        ...(typeof dto.isTrial === 'boolean' ? { isTrial: dto.isTrial } : {}),
        ...(typeof dto.trialOncePerUser === 'boolean'
          ? { trialOncePerUser: dto.trialOncePerUser }
          : {}),
        ...(typeof dto.actualPrice === 'number'
          ? { actualPrice: new Prisma.Decimal(dto.actualPrice) }
          : {}),
        ...(typeof dto.discountedPrice === 'number'
          ? { discountedPrice: new Prisma.Decimal(dto.discountedPrice) }
          : {}),
        ...(typeof dto.isActive === 'boolean' ? { isActive: dto.isActive } : {}),
        ...(dto.features ? { features: dto.features as Prisma.JsonObject } : {}),
        ...(dto.featureConfigs
          ? {
              featureConfigs: {
                deleteMany: { packageId: id },
                create: dto.featureConfigs.map((fc) => ({
                  featureKey: fc.featureKey,
                  limitValue: fc.limitValue,
                  allowExtra: fc.allowExtra ?? false,
                  maxExtra: fc.maxExtra ?? 0,
                  extraUnitPrice: fc.extraUnitPrice ?? null,
                  allowRollover: fc.allowRollover ?? false,
                  maxRolloverCap: fc.maxRolloverCap ?? 0,
                  unitPriceOverride: fc.unitPriceOverride ?? null,
                })),
              },
            }
          : {}),
      },
      include: {
        featureConfigs: true,
        priceSnapshots: true,
      },
    });

    if (dto.featureConfigs) {
      await this.featurePricingService.generateSnapshots(entity.id);
    }

    return PackageDto.fromEntity(entity);
  }

  async remove(id: string): Promise<void> {
    const existing = await this.prisma.subscriptionPackage.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Subscription package not found.');
    }
    await this.prisma.subscriptionPackage.delete({ where: { id } });
  }
}
